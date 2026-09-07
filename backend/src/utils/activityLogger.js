const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity to the database
 * Non-blocking - errors are logged but don't fail the request
 */
async function logActivity({ req, action, targetType, targetId, targetLabel, details }) {
  try {
    await ActivityLog.create({
      actor: req.user._id,
      actorAccessLevel: req.user.accessLevel,
      action,
      targetType,
      targetId,
      targetLabel,
      details
    });
  } catch (err) {
    console.error('Activity log write failed:', err);
    // Don't let logging failure block the actual request
  }
}

module.exports = { logActivity };
