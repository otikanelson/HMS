const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {

    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorAccessLevel: { type: String, required: true }, // snapshot at time of action
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    targetLabel: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    flagged: { type: Boolean, default: false },
    flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    flagReason: { type: String, default: null, trim: true, maxlength: 500 },
    flaggedAt: { type: Date, default: null },
  },
  { timestamps: true });

// Index for efficient queries
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
