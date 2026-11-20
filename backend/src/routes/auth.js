const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Staff = require('../models/Staff');
const Session = require('../models/Session');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { authenticateToken, generateTokens } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // FIXED: Reduced from 50 to 5 (OWASP standard)
  message: {
    error: 'Too many authentication attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// TEMPORARY: Create new admin user with fresh credentials
// POST /api/auth/create-admin
// This endpoint should only be used for initial setup and should be disabled in production
router.post('/create-admin', async (req, res) => {
  try {
    const secretKey = req.headers['x-fix-key'];

    // Verify secret key against environment variable only
    if (!process.env.ADMIN_FIX_KEY || secretKey !== process.env.ADMIN_FIX_KEY) {
      return res.status(403).json({
        error: 'Unauthorized',
        code: 'INVALID_FIX_KEY'
      });
    }

    const { username, password, fullName } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({
        error: 'Username, password, and fullName are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      username: username.toLowerCase().trim()
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists'
      });
    }

    // Create new admin user
    const newUser = new User({
      username: username.toLowerCase().trim(),
      password: password,
      fullName: fullName.trim(),
      accessLevel: 'ADMINISTRATOR',
      isActive: true,
      mustChangePassword: false
    });

    await newUser.save();

    res.json({
      message: '✓ New admin user created successfully',
      user: {
        username: newUser.username,
        fullName: newUser.fullName,
        accessLevel: newUser.accessLevel
      }
    });
  } catch (error) {
    console.error('[AUTH] Create admin error:', error.message);
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    const errorCode = error.name === 'ValidationError' ? 'VALIDATION_ERROR' : 'ADMIN_CREATION_FAILED';
    res.status(statusCode).json({
      error: 'Failed to create admin user',
      code: errorCode
    });
  }
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

// GET /api/auth/staff-list - Get staff list for login selection
// Rate limited to prevent user enumeration
const staffListLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes per IP
  message: {
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

router.get('/staff-list', staffListLimiter, async (req, res) => {
  try {
    // Get all active users
    const users = await User.find({ isActive: true })
      .select('username fullName accessLevel staffId')
      .sort('fullName');

    // Get Staff records with staffId lookup
    const staffIds = users.filter(u => u.staffId).map(u => u.staffId);
    const staffRecords = await Staff.find({ _id: { $in: staffIds } })
      .select('_id role');

    const staffRoleMap = {};
    staffRecords.forEach(staff => {
      const roleMap = {
        'DOCTOR': 'Doctor',
        'NURSE': 'Nurse',
        'TRAINEE_NURSE': 'Trainee Nurse',
        'MIDWIFE': 'Midwife',
        'MAINTENANCE': 'Maintenance'
      };
      staffRoleMap[staff._id.toString()] = roleMap[staff.role] || staff.role;
    });

    // Map users to staff response
    const staff = users.map(user => ({
      _id: user._id,
      fullName: user.fullName,
      roleDisplay: user.staffId && staffRoleMap[user.staffId.toString()]
        ? staffRoleMap[user.staffId.toString()]
        : (user.accessLevel === 'ADMINISTRATOR' ? 'Administrator' :
          user.accessLevel === 'RECORDS_OPERATOR' ? 'Records Operator' :
            'Clinical Staff'),
      username: user.username
    }));

    res.json({ staff });
  } catch (error) {
    console.error('[AUTH] Staff list error:', error.message);
    res.status(500).json({
      error: 'Failed to load staff list',
      code: 'STAFF_LIST_ERROR'
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
    console.error('[AUTH] Login error:', error.message);
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
    console.error('[AUTH] Token refresh error::', error.message);
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
    console.error('[AUTH] Forgot password error::', error.message);
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
    console.error('[AUTH] Logout error::', error.message);
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
    console.error('[AUTH] Logout all error::', error.message);
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
