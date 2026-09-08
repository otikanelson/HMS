const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog'); // TODO(verify path): match wherever other models are required from in this codebase
const { authenticateToken, requireAccessLevel } = require('../middleware/auth');

// GET /api/activity-log
// Every Administrator sees the same shared log — this is centralized
// oversight, not a per-admin scoped view (unlike AdminNotes).
router.get('/', authenticateToken, requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const flaggedOnly = req.query.flaggedOnly === 'true';

    const filter = flaggedOnly ? { flagged: true } : {};

    const [entries, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('actor', 'fullName username accessLevel')
        .populate('flaggedBy', 'fullName username')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      entries,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    console.error('Failed to load activity log:', err);
    res.status(500).json({ error: "We couldn't load the activity log. Please try again." });
  }
});

// PUT /api/activity-log/:id/flag
// Body: { flagged: true, reason: "..." } to flag, or { flagged: false } to clear.
router.put('/:id/flag', authenticateToken, requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const { flagged, reason } = req.body;

    const entry = await ActivityLog.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'That activity log entry no longer exists.' });
    }

    if (flagged) {
      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'A reason is required to flag an activity.' });
      }
      entry.flagged = true;
      entry.flaggedBy = req.user.userId; // TODO(verify field name): match whatever req.user actually uses elsewhere (confirmed by Kiro in an earlier task — use that exact name)
      entry.flagReason = reason.trim();
      entry.flaggedAt = new Date();
    } else {
      entry.flagged = false;
      entry.flaggedBy = null;
      entry.flagReason = null;
      entry.flaggedAt = null;
    }

    await entry.save();
    await entry.populate([
      { path: 'actor', select: 'fullName username accessLevel' },
      { path: 'flaggedBy', select: 'fullName username' },
    ]);

    res.json(entry);
  } catch (err) {
    console.error('Failed to update activity flag:', err);
    res.status(500).json({ error: "That flag couldn't be updated. Please try again." });
  }
});

module.exports = router;