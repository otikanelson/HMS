const express = require('express');
const Notice = require('../models/Notice');
const { authenticateToken, requireAccessLevel } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const router = express.Router();

// GET /api/notices - Get active notices (public - no auth required)
router.get('/', async (req, res) => {
  try {
    const notices = await Notice.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('postedBy', 'fullName')
      .lean();

    res.json({
      notices,
      total: notices.length
    });

  } catch (error) {
    console.error('Notice fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch notices',
      message: 'Internal server error'
    });
  }
});

// POST /api/notices - Create notice (Administrator only)
router.post('/', requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const { title, body, type } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Title is required'
      });
    }

    if (!body || !body.trim()) {
      return res.status(400).json({
        error: 'Body is required'
      });
    }

    if (title.trim().length > 120) {
      return res.status(400).json({
        error: 'Title must be 120 characters or less'
      });
    }

    if (body.trim().length > 500) {
      return res.status(400).json({
        error: 'Body must be 500 characters or less'
      });
    }

    if (type && !['info', 'update', 'urgent'].includes(type)) {
      return res.status(400).json({
        error: 'Type must be one of: info, update, urgent'
      });
    }

    // Create notice
    const notice = new Notice({
      title: title.trim(),
      body: body.trim(),
      type: type || 'info',
      postedBy: req.user.id
    });

    await notice.save();

    // Populate postedBy before returning
    await notice.populate('postedBy', 'fullName');

    // Log activity
    await logActivity({
      req,
      action: 'NOTICE_CREATED',
      targetType: 'Notice',
      targetId: notice._id,
      targetLabel: notice.title,
      details: { type: notice.type }
    });

    res.status(201).json({
      notice: notice.toObject(),
      message: 'Notice created successfully'
    });

  } catch (error) {
    console.error('Notice creation error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.keys(error.errors).map(key => error.errors[key].message)
      });
    }

    res.status(500).json({
      error: 'Failed to create notice',
      message: 'Internal server error'
    });
  }
});

// DELETE /api/notices/:id - Soft-delete notice (Administrator only)
router.delete('/:id', requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid notice ID'
      });
    }

    const notice = await Notice.findById(id);

    if (!notice) {
      return res.status(404).json({
        error: 'Notice not found'
      });
    }

    if (!notice.isActive) {
      return res.status(400).json({
        error: 'Notice is already inactive'
      });
    }

    // Soft-delete: set isActive to false
    notice.isActive = false;
    await notice.save();

    // Log activity
    await logActivity({
      req,
      action: 'NOTICE_DELETED',
      targetType: 'Notice',
      targetId: notice._id,
      targetLabel: notice.title,
      details: { type: notice.type }
    });

    res.json({
      message: 'Notice removed successfully'
    });

  } catch (error) {
    console.error('Notice deletion error:', error);
    res.status(500).json({
      error: 'Failed to remove notice',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
