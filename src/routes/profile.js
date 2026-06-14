const express = require('express');
const User = require('../models/User');
const Session = require('../models/Session');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      code: 'PROFILE_GET_ERROR'
    });
  }
});

// Update user profile
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { fullName, username, phoneNumber, profilePicture } = req.body;
    const userId = req.user._id;

    // Build update object
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (username !== undefined) updateData.username = username.toLowerCase().trim();
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber.trim();
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

    // Validation
    if (updateData.username) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        username: updateData.username
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Username already taken by another user',
          code: 'DUPLICATE_USERNAME'
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser.getPublicProfile()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Username already taken',
        code: 'DUPLICATE_USERNAME'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Invalid profile data',
        code: 'VALIDATION_ERROR',
        details: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {})
      });
    }

    res.status(500).json({
      error: 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Get user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Invalidate all other sessions (force re-login on other devices)
    await Session.updateMany(
      { 
        userId: userId,
        _id: { $ne: req.session._id }
      },
      { isActive: false }
    );

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

// Get user sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await Session.find({
      userId: req.user._id,
      isActive: true
    }).sort({ lastActivity: -1 });

    const sessionData = sessions.map(session => ({
      _id: session._id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session._id.toString() === req.session._id.toString()
    }));

    res.json({
      sessions: sessionData
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Failed to get sessions',
      code: 'SESSIONS_GET_ERROR'
    });
  }
});

// Revoke a specific session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    // Can't revoke current session
    if (sessionId === req.session._id.toString()) {
      return res.status(400).json({
        error: 'Cannot revoke current session. Use logout instead.',
        code: 'CANNOT_REVOKE_CURRENT_SESSION'
      });
    }

    const session = await Session.findOneAndUpdate(
      { 
        _id: sessionId,
        userId: userId,
        isActive: true
      },
      { isActive: false },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Session revoked successfully'
    });

  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      error: 'Failed to revoke session',
      code: 'SESSION_REVOKE_ERROR'
    });
  }
});

// Delete account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;

    if (!password) {
      return res.status(400).json({
        error: 'Password confirmation required',
        code: 'PASSWORD_REQUIRED'
      });
    }

    // Get user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        error: 'Password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // Deactivate user instead of deleting (for data integrity)
    user.isActive = false;
    user.username = `deleted_${Date.now()}_${user.username}`;
    await user.save();

    // Invalidate all sessions
    await Session.updateMany(
      { userId: userId },
      { isActive: false }
    );

    res.json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      code: 'ACCOUNT_DELETE_ERROR'
    });
  }
});

module.exports = router;