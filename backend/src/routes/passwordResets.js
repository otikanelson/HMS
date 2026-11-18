const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Staff = require('../models/Staff');
const Session = require('../models/Session');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();

// List of common English words for password generation (60 short, unambiguous words)
const WORD_LIST = [
  'Apple', 'Beach', 'Cabin', 'Dance', 'Eagle', 'Field', 'Green', 'House',
  'Image', 'Jungle', 'Kite', 'Lemon', 'Maple', 'Nature', 'Ocean', 'Piano',
  'Quest', 'River', 'Stone', 'Tiger', 'Umbrella', 'Valley', 'Water', 'Yacht',
  'Zebra', 'Anchor', 'Bridge', 'Castle', 'Desert', 'Engine', 'Forest', 'Galaxy',
  'Harbor', 'Island', 'Kernel', 'Ladder', 'Magnet', 'Napkin', 'Office', 'Palace',
  'Quilt', 'Rabbit', 'Shelter', 'Tower', 'Unique', 'Vortex', 'Walnut', 'Yonder',
  'Zenith', 'Aurora', 'Beacon', 'Canvas', 'Drape', 'Ember', 'Flame', 'Garden',
  'Helix', 'Iris', 'Joust', 'Kiosk', 'Ladder', 'Marble', 'Network', 'Origin'
];

// Generate a user-friendly password: two words + 2-digit number
function generatePassword() {
  const word1 = WORD_LIST[crypto.randomInt(0, WORD_LIST.length)];
  const word2 = WORD_LIST[crypto.randomInt(0, WORD_LIST.length)];
  const number = crypto.randomInt(10, 100);
  return `${word1}-${word2}-${number}`;
}

// GET / - Get all password reset requests (pending first, newest first, + 10 recent resolved/dismissed)
router.get('/', async (req, res) => {
  try {
    // Get pending requests (newest first)
    const pendingRequests = await PasswordResetRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('resolvedBy', 'fullName')
      .lean();

    // Get 10 most recent resolved/dismissed requests
    const recentResolved = await PasswordResetRequest.find({
      status: { $in: ['resolved', 'dismissed'] }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('resolvedBy', 'fullName')
      .lean();

    // Combine: pending first, then recent resolved/dismissed
    const allRequests = [...pendingRequests, ...recentResolved];

    // Format response
    const formattedRequests = allRequests.map(req => ({
      id: req._id,
      fullNameSnapshot: req.fullNameSnapshot,
      usernameSnapshot: req.usernameSnapshot,
      status: req.status,
      createdAt: req.createdAt,
      resolvedAt: req.resolvedAt,
      resolvedBy: req.resolvedBy ? req.resolvedBy.fullName : null
    }));

    // Count pending requests
    const pendingCount = pendingRequests.length;

    res.json({
      requests: formattedRequests,
      pendingCount
    });
  } catch (error) {
    console.error('Error fetching password reset requests:', error);
    res.status(500).json({
      error: 'Failed to fetch password reset requests'
    });
  }
});

// GET /count - Get count of pending requests
router.get('/count', async (req, res) => {
  try {
    const pendingCount = await PasswordResetRequest.countDocuments({
      status: 'pending'
    });

    res.json({ pendingCount });
  } catch (error) {
    console.error('Error fetching pending count:', error);
    res.status(500).json({
      error: 'Failed to fetch pending count'
    });
  }
});

// GET /suggest - Get a suggested password
router.get('/suggest', async (req, res) => {
  try {
    const password = generatePassword();
    res.json({ password });
  } catch (error) {
    console.error('Error generating password:', error);
    res.status(500).json({
      error: 'Failed to generate password'
    });
  }
});

// POST /:id/reset - Set a new password for a password reset request
router.post('/:id/reset', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const requestId = req.params.id;

    // Validate password
    if (!newPassword) {
      return res.status(400).json({
        error: 'Password is required'
      });
    }

    if (newPassword.length < 8 || newPassword.length > 64) {
      return res.status(400).json({
        error: 'Password must be between 8 and 64 characters'
      });
    }

    // Find the password reset request
    const resetRequest = await PasswordResetRequest.findById(requestId);
    if (!resetRequest) {
      return res.status(404).json({
        error: 'Password reset request not found'
      });
    }

    // Check if already handled
    if (resetRequest.status !== 'pending') {
      return res.status(400).json({
        error: 'This request has already been handled.'
      });
    }

    // Find and load the user
    const user = await User.findById(resetRequest.user);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        error: 'This staff member is deactivated.'
      });
    }

    // Check if staff is active (if linked)
    if (user.staffId) {
      const staff = await Staff.findById(user.staffId);
      if (staff && staff.onDuty === false) {
        // Staff may be marked as off-duty but not deactivated; allow reset
      }
    }

    // Set new password and mark for change
    user.password = newPassword;
    user.mustChangePassword = true;
    await user.save(); // Pre-save hook will hash the password

    // Invalidate all existing sessions
    await Session.updateMany(
      { userId: user._id },
      { isActive: false }
    );

    // Mark request as resolved
    resetRequest.status = 'resolved';
    resetRequest.resolvedBy = req.user._id;
    resetRequest.resolvedAt = new Date();
    await resetRequest.save();

    // Log activity (without password)
    await logActivity({
      req,
      action: 'PASSWORD_RESET_ASSIGNED',
      targetType: 'User',
      targetId: user._id,
      targetLabel: user.fullName
    });

    res.json({
      message: `Password set. Tell ${user.fullName} their new password in person.`
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      error: 'Failed to reset password'
    });
  }
});

// POST /:id/dismiss - Dismiss a password reset request
router.post('/:id/dismiss', async (req, res) => {
  try {
    const requestId = req.params.id;

    const resetRequest = await PasswordResetRequest.findById(requestId);
    if (!resetRequest) {
      return res.status(404).json({
        error: 'Password reset request not found'
      });
    }

    // Update to dismissed
    resetRequest.status = 'dismissed';
    resetRequest.resolvedBy = req.user._id;
    resetRequest.resolvedAt = new Date();
    await resetRequest.save();

    // Log activity
    await logActivity({
      req,
      action: 'PASSWORD_RESET_DISMISSED',
      targetType: 'PasswordResetRequest',
      targetId: resetRequest._id,
      targetLabel: resetRequest.fullNameSnapshot
    });

    res.json({
      message: 'Password reset request dismissed.'
    });
  } catch (error) {
    console.error('Error dismissing password reset:', error);
    res.status(500).json({
      error: 'Failed to dismiss password reset request'
    });
  }
});

module.exports = router;
