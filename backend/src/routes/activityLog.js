const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const { requireAccessLevel } = require('../middleware/auth');
const router = express.Router();

// GET /api/activity-log - Get activity logs (Administrator only, paginated)
router.get('/', requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'fullName username accessLevel')
      .lean();

    const total = await ActivityLog.countDocuments();

    res.json({
      logs,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: logs.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Activity log fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch activity logs',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
