const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const PayrollRun = require('../models/PayrollRun');
const PayrollEntry = require('../models/PayrollEntry');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { authenticateToken, requireAccessLevel } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Helper: Convert naira to kobo (naira × 100)
function toKobo(naira) {
  return Math.round(naira * 100);
}

// Helper: Build payment reference
// Format: thc-<runId last 6>-<entryId last 8>-<attempt number>
function buildReference(runId, entryId, attemptNumber = 1) {
  const runIdStr = runId.toString().slice(-6);
  const entryIdStr = entryId.toString().slice(-8);
  return `thc-${runIdStr}-${entryIdStr}-${attemptNumber}`;
}

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

// GET /api/payroll/runs/:id/payment-check
router.get('/runs/:id/payment-check', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found.' });

    if (run.status !== 'approved') {
      return res.status(400).json({ error: 'Only an approved run can have payments checked.' });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return res.json({
        configured: false
      });
    }

    // Get Paystack balance
    let balance = 0;
    try {
      const balanceRes = await fetch('https://api.paystack.co/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`
        }
      });

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        // Balance is in kobo, convert to naira
        balance = Math.floor(data.data[0]?.balance || 0) / 100;
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }

    // Get entries
    const entries = await PayrollEntry.find({ run: run._id })
      .populate('staff', 'fullName bankCode accountNumber accountName salary');

    // Calculate totals and check for problems
    let total = 0;
    const problems = [];
    let count = 0;

    for (const entry of entries) {
      if (entry.totalAmount <= 0) {
        problems.push({
          staffName: entry.staffNameSnapshot,
          problem: 'Salary is zero or negative'
        });
        continue;
      }

      if (!entry.staff.bankCode || !entry.staff.accountNumber) {
        problems.push({
          staffName: entry.staffNameSnapshot,
          problem: 'No bank chosen'
        });
        continue;
      }

      total += entry.totalAmount;
      count++;
    }

    const balanceKobo = toKobo(balance);
    const totalKobo = toKobo(total);
    const enough = balanceKobo >= totalKobo;

    res.json({
      configured: true,
      balance,
      total,
      count,
      enough,
      shortBy: enough ? 0 : total - balance,
      problems
    });
  } catch (err) {
    console.error('Failed to check payment:', err);
    res.status(500).json({ error: 'Payment check failed.' });
  }
});

// POST /api/payroll/runs/:id/pay-with-paystack
// Rate limit tracking map (in production, use Redis)
const passwordAttempts = new Map();

router.post('/runs/:id/pay-with-paystack', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found.' });

    if (run.status !== 'approved') {
      return res.status(400).json({ error: 'Only an approved run can be paid.' });
    }

    if (run.paymentStatus === 'in_progress') {
      return res.status(400).json({ error: 'A payment is already in progress for this run.' });
    }

    // Password verification with rate limiting
    const userId = req.user._id.toString();
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    if (!passwordAttempts.has(userId)) {
      passwordAttempts.set(userId, []);
    }

    const attempts = passwordAttempts.get(userId).filter(t => now - t < fifteenMinutes);
    if (attempts.length >= 5) {
      return res.status(429).json({ error: 'Too many failed password attempts. Try again later.' });
    }

    const { password } = req.body;
    const user = await User.findById(req.user._id);

    if (!password || !(await user.comparePassword(password))) {
      attempts.push(now);
      passwordAttempts.set(userId, attempts);
      return res.status(400).json({ error: 'Your password is not correct.' });
    }

    // Re-run payment check
    const checkRes = await fetch(`${req.protocol}://${req.get('host')}/api/payroll/runs/${run._id}/payment-check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${req.headers.authorization?.split(' ')[1] || ''}`
      }
    });

    if (!checkRes.ok) {
      return res.status(400).json({ error: 'Payment check failed.' });
    }

    const check = await checkRes.json();

    if (!check.configured) {
      return res.status(503).json({ error: 'Paystack is not set up yet.' });
    }

    if (check.problems && check.problems.length > 0) {
      return res.json({
        problems: check.problems,
        balance: check.balance,
        total: check.total,
        count: check.count,
        enough: check.enough
      });
    }

    if (!check.enough) {
      return res.json({
        problems: [{ staffName: 'Paystack', problem: `Not enough balance. Short by ₦${check.shortBy}` }],
        balance: check.balance,
        total: check.total,
        count: check.count,
        enough: false
      });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const entries = await PayrollEntry.find({ run: run._id })
      .populate('staff', 'fullName bankCode accountNumber accountName');

    // Prepare entries for sending
    const entriesToSend = [];
    for (const entry of entries) {
      if (
        (entry.payment.status === 'not_sent' || entry.payment.status === 'failed') &&
        entry.totalAmount > 0 &&
        entry.staff.bankCode &&
        entry.staff.accountNumber
      ) {
        entriesToSend.push(entry);
      }
    }

    if (entriesToSend.length === 0) {
      return res.json({ problems: [], message: 'No entries to send.' });
    }

    // Create/verify recipients and build batch
    const transfers = [];
    for (const entry of entriesToSend) {
      // Generate reference
      const attemptNum = entry.payment.reference
        ? parseInt(entry.payment.reference.split('-').pop()) + 1
        : 1;
      const ref = buildReference(run._id, entry._id, attemptNum);

      // Create recipient if needed
      if (!entry.staff.paystackRecipientCode) {
        const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'nuban',
            name: entry.staff.accountName || entry.staff.fullName,
            account_number: entry.staff.accountNumber,
            bank_code: entry.staff.bankCode,
            currency: 'NGN'
          })
        });

        if (!recipientRes.ok) {
          console.error('Failed to create recipient:', entry.staff.fullName);
          continue;
        }

        const recipientData = await recipientRes.json();
        if (recipientData.status && recipientData.data?.recipient_code) {
          entry.staff.paystackRecipientCode = recipientData.data.recipient_code;
          await entry.staff.save();
        }
      }

      entry.payment.status = 'sending';
      entry.payment.reference = ref;
      entry.payment.sentAt = new Date();
      await entry.save();

      transfers.push({
        amount: toKobo(entry.totalAmount),
        recipient: entry.staff.paystackRecipientCode,
        reference: ref
      });
    }

    if (transfers.length === 0) {
      return res.json({ problems: [], message: 'Failed to prepare transfers.' });
    }

    // Send in batches of 100
    const batchSize = 100;
    const transferCodes = [];

    for (let i = 0; i < transfers.length; i += batchSize) {
      const batch = transfers.slice(i, i + batchSize);

      const batchRes = await fetch('https://api.paystack.co/transfer/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currency: 'NGN',
          source: 'balance',
          transfers: batch
        })
      });

      if (!batchRes.ok) {
        // Mark all entries in batch as failed
        for (const ref of batch.map(t => t.reference)) {
          const entry = await PayrollEntry.findOne({ 'payment.reference': ref });
          if (entry) {
            entry.payment.status = 'failed';
            entry.payment.failureReason = 'Batch transfer failed';
            await entry.save();
          }
        }
        continue;
      }

      const batchData = await batchRes.json();
      if (batchData.status && batchData.data?.transfers) {
        for (const transfer of batchData.data.transfers) {
          const entry = await PayrollEntry.findOne({
            'payment.reference': transfer.reference
          });
          if (entry) {
            entry.payment.transferCode = transfer.transfer_code;
            await entry.save();
          }
          transferCodes.push(transfer.transfer_code);
        }
      }
    }

    // Update run
    run.paymentStatus = 'in_progress';
    run.paymentMethod = 'paystack';
    run.paymentStartedBy = req.user._id;
    run.paymentStartedAt = new Date();
    await run.save();

    await logActivity({
      req,
      action: 'PAYROLL_PAYMENT_STARTED',
      targetType: 'PayrollRun',
      targetId: run._id,
      targetLabel: run.periodLabel,
      details: { count: entriesToSend.length, total }
    });

    // Return current status
    const updatedEntries = await PayrollEntry.find({ run: run._id })
      .populate('staff', 'fullName');

    res.json({
      message: 'Payment started',
      entries: updatedEntries.map(e => ({
        _id: e._id,
        staffName: e.staffNameSnapshot,
        amount: e.totalAmount,
        status: e.payment.status
      }))
    });
  } catch (err) {
    console.error('Failed to pay with Paystack:', err);
    res.status(500).json({ error: 'Payment failed.' });
  }
});

// PUT /api/payroll/runs/:id/pay — approved -> paid, cascades to all entries (manual bank transfer)
router.put('/runs/:id/pay', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found.' });

    if (run.status !== 'approved') {
      return res.status(400).json({ error: 'A run must be approved before it can be marked as paid.' });
    }

    if (run.paymentStatus === 'in_progress') {
      return res.status(400).json({ error: 'A Paystack payment is in progress.' });
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