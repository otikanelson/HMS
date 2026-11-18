const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Session = require('../models/Session');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { authenticateToken, generateTokens } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per window (increased for development)
  message: {
    error: 'Too many authentication attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for forgot password (5 per 15 minutes per IP)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many password reset requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/auth/staff-list - Get staff list for login selection (public, no auth)
router.get('/staff-list', async (req, res) => {
  try {
    // Get all active staff with user accounts
    const users = await User.find({ isActive: true })
      .select('staffId username accessLevel')
      .populate('staffId', 'firstName lastName role');
    
    const staff = users
      .filter(user => user.staffId) // Only include users with linked staff records
      .map(user => ({
        _id: user.staffId._id,
        fullName: `${user.staffId.firstName} ${user.staffId.lastName}`,
        roleDisplay: user.staffId.role.charAt(0) + user.staffId.role.slice(1).toLowerCase().replace(/_/g, ' '),
        username: user.username
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    res.json({ staff });
  } catch (error) {
    console.error('Staff list error:', error);
    res.status(500).json({
      error: 'Failed to load staff list',
      message: 'Internal server error'
    });
  }
});

// Login endpoint
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by exact lowercase username match
    const user = await User.findOne({ 
      username: username.toLowerCase().trim()
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Invalidate old sessions (optional - keep only the latest)
    await Session.updateMany(
      { userId: user._id },
      { isActive: false }
    );

    // Generate new tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.accessLevel, user.staffId, user.mustChangePassword);

    // Create new session
    const session = new Session({
      userId: user._id,
      token: accessToken,
      refreshToken,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
    });

    await session.save();

    res.json({
      message: 'Login successful',
      user: user.getPublicProfile(),
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed. Please try again.',
      code: 'LOGIN_ERROR'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Find session with refresh token
    const session = await Session.findOne({ 
      refreshToken,
      isActive: true
    }).populate('userId');

    if (!session || session.isExpired()) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(session.userId._id, session.userId.accessLevel, session.userId.staffId, session.userId.mustChangePassword);

    // Update session
    session.token = accessToken;
    session.refreshToken = newRefreshToken;
    await session.extendSession(4);

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      user: session.userId.getPublicProfile()
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

// POST /api/auth/forgot-password - Public endpoint to request password reset
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { userId, username } = req.body;

    if (!userId && !username) {
      return res.status(400).json({
        error: 'User ID or username is required',
        code: 'MISSING_IDENTIFIER'
      });
    }

    let user;

    // Find user by ID or username
    if (userId) {
      // If userId provided, treat it as a Staff ID and find the User by staffId
      user = await User.findOne({ staffId: userId, isActive: true });
    } else if (username) {
      // Find by exact lowercase username match
      user = await User.findOne({
        username: username.toLowerCase(),
        isActive: true
      });
    }

    // Always return the same message whether user exists or not (for security)
    // but only create a request if user was found and has no pending request
    if (user) {
      // Check for existing pending request
      const existingRequest = await PasswordResetRequest.findOne({
        user: user._id,
        status: 'pending'
      });

      if (!existingRequest) {
        // Create new password reset request
        await PasswordResetRequest.create({
          user: user._id,
          staff: user.staffId || null,
          usernameSnapshot: user.username,
          fullNameSnapshot: user.fullName,
          status: 'pending'
        });
      }
    }

    // Always return success message
    res.status(200).json({
      message: 'Your request has been sent to the administrator.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Failed to process password reset request',
      code: 'RESET_REQUEST_ERROR'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Invalidate current session
    await Session.findByIdAndUpdate(req.session._id, { isActive: false });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Logout all devices
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    // Invalidate all user sessions
    await Session.updateMany(
      { userId: req.user._id },
      { isActive: false }
    );

    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Logout all failed',
      code: 'LOGOUT_ALL_ERROR'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// Validate token endpoint
router.get('/validate', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

module.exports = router;