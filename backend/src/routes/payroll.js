const express = require('express');
const router = express.Router();
const PayrollRun = require('../models/PayrollRun');
const PayrollEntry = require('../models/PayrollEntry');
const Staff = require('../models/Staff');
const { authenticateToken, requireAccessLevel } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Every payroll route is Administrator-only, no exceptions — matches the
// authorization matrix already established for this module.
router.use(authenticateToken, requireAccessLevel('ADMINISTRATOR'));

// GET /api/payroll/runs — list all runs, most recent period first
router.get('/runs', async (req, res) => {
  try {
    const runs = await PayrollRun.find().sort({ periodYear: -1, periodMonth: -1 });

    // Attach entry count + total for each run without a separate round trip per run
    const runIds = runs.map((r) => r._id);
    const totals = await PayrollEntry.aggregate([
      { $match: { run: { $in: runIds } } },
      { $group: { _id: '$run', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
    ]);
    const totalsByRun = Object.fromEntries(totals.map((t) => [t._id.toString(), t]));

    const result = runs.map((run) => ({
      ...run.toObject(),
      entryCount: totalsByRun[run._id.toString()]?.count || 0,
      totalAmount: totalsByRun[run._id.toString()]?.total || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('Failed to load payroll runs:', err);
    res.status(500).json({ error: "We couldn't load payroll runs. Please try again." });
  }
});

// POST /api/payroll/runs — create a new run for a given month/year,
// auto-populated with one entry per active staff member
router.post('/runs', async (req, res) => {
  try {
    const { periodMonth, periodYear } = req.body;

    if (!periodMonth || periodMonth < 1 || periodMonth > 12 || !periodYear) {
      return res.status(400).json({ error: 'A valid month and year are required.' });
    }

    const existing = await PayrollRun.findOne({ periodMonth, periodYear });
    if (existing) {
      return res.status(400).json({
        error: `A payroll run for ${MONTH_NAMES[periodMonth - 1]} ${periodYear} already exists.`,
      });
    }

    // onDuty represents "still employed" — not confused with today's shift
    const activeStaff = await Staff.find({ onDuty: true });

    if (activeStaff.length === 0) {
      return res.status(400).json({ error: 'There are no active staff members to include in this run.' });
    }

    const periodLabel = `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`;

    const run = await PayrollRun.create({
      periodLabel,
      periodMonth,
      periodYear,
      status: 'pending',
      createdBy: req.user._id,
    });

    const entries = await PayrollEntry.insertMany(
      activeStaff.map((staff) => ({
        run: run._id,
        staff: staff._id,
        staffNameSnapshot: staff.fullName,
        baseSalary: staff.salary || 0,
        adjustmentAmount: 0,
        adjustmentNote: null,
        totalAmount: staff.salary || 0,
        status: 'pending',
      }))
    );

    await logActivity({ 
      req, 
      action: 'PAYROLL_RUN_CREATED', 
      targetType: 'PayrollRun', 
      targetId: run._id, 
      targetLabel: periodLabel 
    });

    res.status(201).json({ run, entries });
  } catch (err) {
    console.error('Failed to create payroll run:', err);
    res.status(500).json({ error: "We couldn't create this payroll run. Please try again." });
  }
});

// GET /api/payroll/runs/:id — a single run with its entries
router.get('/runs/:id', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found.' });

    const entries = await PayrollEntry.find({ run: run._id })
      .populate('staff', 'fullName role bankAccount accountNumber')
      .sort({ staffNameSnapshot: 1 });

    res.json({ run, entries });
  } catch (err) {
    console.error('Failed to load payroll run:', err);
    res.status(500).json({ error: "We couldn't load this payroll run. Please try again." });
  }
});

// PUT /api/payroll/entries/:id — adjust one entry's bonus/deduction
// Only allowed while the parent run is still 'pending'.
router.put('/entries/:id', async (req, res) => {
  try {
    const { adjustmentAmount, adjustmentNote } = req.body;

    const entry = await PayrollEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Payroll entry not found.' });

    const run = await PayrollRun.findById(entry.run);
    if (!run || run.status !== 'pending') {
      return res.status(400).json({
        error: 'This entry can no longer be adjusted — its payroll run has already been approved.',
      });
    }

    const amount = Number(adjustmentAmount) || 0;
    if (amount !== 0 && (!adjustmentNote || !adjustmentNote.trim())) {
      return res.status(400).json({ error: 'A note is required whenever a bonus or deduction is applied.' });
    }

    entry.adjustmentAmount = amount;
    entry.adjustmentNote = amount !== 0 ? adjustmentNote.trim() : null;
    entry.totalAmount = entry.baseSalary + amount;
    await entry.save();

    await logActivity({ 
      req, 
      action: 'PAYROLL_ENTRY_ADJUSTED', 
      targetType: 'PayrollEntry', 
      targetId: entry._id, 
      targetLabel: entry.staffNameSnapshot, 
      details: { adjustmentAmount: amount, adjustmentNote } 
    });

    res.json(entry);
  } catch (err) {
    console.error('Failed to adjust payroll entry:', err);
    res.status(500).json({ error: "That adjustment didn't save. Please try again." });
  }
});

// PUT /api/payroll/runs/:id/approve — pending -> approved, cascades to all entries
router.put('/runs/:id/approve', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found.' });

    if (run.status !== 'pending') {
      return res.status(400).json({ error: 'Only a pending run can be approved.' });
    }

    run.status = 'approved';
    run.approvedBy = req.user._id;
    run.approvedAt = new Date();
    await run.save();

    await PayrollEntry.updateMany({ run: run._id }, { status: 'approved' });

    await logActivity({ 
      req, 
      action: 'PAYROLL_RUN_APPROVED', 
      targetType: 'PayrollRun', 
      targetId: run._id, 
      targetLabel: run.periodLabel 
    });

    res.json(run);
  } catch (err) {
    console.error('Failed to approve payroll run:', err);
    res.status(500).json({ error: "This run couldn't be approved. Please try again." });
  }
});

// PUT /api/payroll/runs/:id/pay — approved -> paid, cascades to all entries
router.put('/runs/:id/pay', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found.' });

    if (run.status !== 'approved') {
      return res.status(400).json({ error: 'A run must be approved before it can be marked as paid.' });
    }

    run.status = 'paid';
    run.paidBy = req.user._id;
    run.paidAt = new Date();
    await run.save();

    await PayrollEntry.updateMany({ run: run._id }, { status: 'paid' });

    await logActivity({ 
      req, 
      action: 'PAYROLL_RUN_PAID', 
      targetType: 'PayrollRun', 
      targetId: run._id, 
      targetLabel: run.periodLabel 
    });

    res.json(run);
  } catch (err) {
    console.error('Failed to mark payroll run as paid:', err);
    res.status(500).json({ error: "This run couldn't be marked as paid. Please try again." });
  }
});

module.exports = router;