const mongoose = require('mongoose');

const payrollEntrySchema = new mongoose.Schema(
  {
    run: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },

    // Snapshots taken at run-creation time — intentionally NOT a live
    // lookup. If a staff member's name or salary changes later, past
    // payroll history must still reflect what was true when the run was
    // created, not what's true today.
    staffNameSnapshot: { type: String, required: true },
    baseSalary: { type: Number, required: true, min: 0 },

    adjustmentAmount: { type: Number, default: 0 }, // positive = bonus, negative = deduction
    adjustmentNote: { type: String, default: null, trim: true, maxlength: 500 },

    totalAmount: { type: Number, required: true }, // baseSalary + adjustmentAmount, kept in sync on every save

    status: {
      type: String,
      enum: ['pending', 'approved', 'paid'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

payrollEntrySchema.index({ run: 1 });
payrollEntrySchema.index({ staff: 1 });

module.exports = mongoose.model('PayrollEntry', payrollEntrySchema);