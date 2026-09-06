const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRE = '15m'; // Short-lived access tokens
const REFRESH_TOKEN_EXPIRE = '7d'; // Longer-lived refresh tokens

// Generate tokens
const generateTokens = (userId, accessLevel, staffId, mustChangePassword) => {
  const accessToken = jwt.sign({ userId, accessLevel, staffId, mustChangePassword }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
  const refreshToken = jwt.sign({ userId, accessLevel, staffId, mustChangePassword, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
  
  return { accessToken, refreshToken };
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session exists and is active
    const session = await Session.findOne({ 
      token,
      userId: decoded.userId,
      isActive: true
    });

    if (!session) {
      return res.status(401).json({ 
        error: 'Invalid or expired session',
        code: 'INVALID_SESSION'
      });
    }

    // Check if session is expired
    if (session.isExpired()) {
      await session.deleteOne();
      return res.status(401).json({ 
        error: 'Session expired',
        code: 'SESSION_EXPIRED'
      });
    }

    // Get user data
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
    }

    // Update session activity
    await session.updateActivity();

    // Extend session if it's close to expiring (less than 1 hour left)
    const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (timeUntilExpiry < oneHour) {
      await session.extendSession(4); // Extend by 4 hours
    }

    // Attach user data with accessLevel, staffId, and mustChangePassword to req.user
    req.user = {
      ...user.getPublicProfile(),
      accessLevel: decoded.accessLevel || user.accessLevel, // Use JWT claim, fallback to DB
      staffId: decoded.staffId || user.staffId,
      mustChangePassword: decoded.mustChangePassword !== undefined ? decoded.mustChangePassword : user.mustChangePassword
    };
    req.session = session;
    
    // Enforce password change requirement
    // Block all requests except password change, profile view, and logout
    if (req.user.mustChangePassword) {
      const exemptPaths = [
        { method: 'PUT', path: '/api/profile/password' },
        { method: 'GET', path: '/api/profile' },
        { method: 'POST', path: '/api/auth/logout' },
        { method: 'POST', path: '/api/auth/logout-all' }
      ];
      
      const isExempt = exemptPaths.some(exempt => 
        req.method === exempt.method && req.path === exempt.path
      );
      
      if (!isExempt) {
        return res.status(403).json({
          error: 'You must change your password before continuing.',
          code: 'PASSWORD_CHANGE_REQUIRED'
        });
      }
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// Admin role check (updated for accessLevel)
const requireAdmin = (req, res, next) => {
  if (req.user.accessLevel !== 'ADMINISTRATOR') {
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {});
  } catch (error) {
    // Ignore auth errors for optional auth
  }
  next();
};

// Role-based authorization middleware
const requireAccessLevel = (...allowedLevels) => {
  return (req, res, next) => {
    if (!req.user || !allowedLevels.includes(req.user.accessLevel)) {
      return res.status(403).json({
        error: "You don't have permission to do this.",
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  generateTokens,
  requireAccessLevel,
  JWT_SECRET
};