const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema(
  {
    periodLabel: { type: String, required: true, trim: true }, // e.g. "August 2026"
    periodMonth: { type: Number, required: true, min: 1, max: 12 },
    periodYear: { type: Number, required: true, min: 2020, max: 2100 },

    status: {
      type: String,
      enum: ['pending', 'approved', 'paid'],
      default: 'pending',
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    paidAt: { type: Date, default: null },

    paymentStatus: {
      type: String,
      enum: ['not_started', 'in_progress', 'finished'],
      default: 'not_started'
    },
    paymentStartedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    paymentStartedAt: { type: Date, default: null },
    paymentMethod: {
      type: String,
      enum: ['paystack', 'manual', null],
      default: null
    },
  },
  { timestamps: true }
);

// One run per calendar period — prevents accidentally creating August twice
payrollRunSchema.index({ periodMonth: 1, periodYear: 1 }, { unique: true });

module.exports = mongoose.model('PayrollRun', payrollRunSchema);