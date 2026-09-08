import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './Payroll.css';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', paid: 'Paid' };

async function fetchRun(id) {
  const res = await axios.get(`/api/payroll/runs/${id}`);
  return res.data;
}

async function adjustEntry(entryId, adjustmentAmount, adjustmentNote) {
  const res = await axios.put(`/api/payroll/entries/${entryId}`, { adjustmentAmount, adjustmentNote });
  return res.data;
}

async function approveRun(id) {
  const res = await axios.put(`/api/payroll/runs/${id}/approve`);
  return res.data;
}

async function payRun(id) {
  const res = await axios.put(`/api/payroll/runs/${id}/pay`);
  return res.data;
}

const PayrollRunDetail = () => {
  const { id } = useParams();

  const [run, setRun] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('increase'); // 'increase' or 'deduction'
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmingAction, setConfirmingAction] = useState(null); // 'approve' | 'pay' | null
  const [actionBusy, setActionBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchRun(id);
      setRun(data.run);
      setEntries(data.entries);
    } catch (err) {
      setError("We couldn't load this payroll run.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startEditing = (entry) => {
    setEditingId(entry._id);
    const amount = entry.adjustmentAmount || 0;
    if (amount >= 0) {
      setAdjustmentType('increase');
      setEditAmount(Math.abs(amount));
    } else {
      setAdjustmentType('deduction');
      setEditAmount(Math.abs(amount));
    }
    setEditNote(entry.adjustmentNote || '');
  };

  const saveAdjustment = async (entryId) => {
    const rawAmount = Number(editAmount) || 0;
    const amount = adjustmentType === 'deduction' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
    
    if (amount !== 0 && !editNote.trim()) {
      setError('A note is required whenever a bonus or deduction is applied.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await adjustEntry(entryId, amount, editNote);
      setEntries((prev) => prev.map((e) => (e._id === entryId ? updated : e)));
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.error || "That adjustment didn't save.");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action) => {
    setActionBusy(true);
    setError('');
    try {
      const updatedRun = action === 'approve' ? await approveRun(id) : await payRun(id);
      setRun(updatedRun);
      setEntries((prev) => prev.map((e) => ({ ...e, status: updatedRun.status })));
      setConfirmingAction(null);
    } catch (err) {
      setError(err.response?.data?.error || 'That action failed. Please try again.');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return <div className="payroll-page"><p className="payroll-status-text">Loading...</p></div>;
  }
  if (!run) {
    return <div className="payroll-page"><p className="payroll-status-text">{error || 'Run not found.'}</p></div>;
  }

  const total = entries.reduce((sum, e) => sum + e.totalAmount, 0);
  const isPending = run.status === 'pending';
  const isApproved = run.status === 'approved';

  return (
    <div className="payroll-page">
      <Link to="/payroll" className="payroll-back-link">&larr; All payroll runs</Link>

      <div className="payroll-header">
        <div>
          <h1>{run.periodLabel}</h1>
          <p className="payroll-subtitle">
            <span className={`payroll-status-badge payroll-status-${run.status}`}>
              {STATUS_LABELS[run.status]}
            </span>
            {' '}&middot; {entries.length} staff &middot; {formatCurrency(total)} total
          </p>
        </div>
        <div className="payroll-run-actions">
          {isPending && (
            <button type="button" className="payroll-btn-primary" onClick={() => setConfirmingAction('approve')}>
              Approve Run
            </button>
          )}
          {isApproved && (
            <button type="button" className="payroll-btn-primary" onClick={() => setConfirmingAction('pay')}>
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      {error && <div className="payroll-error">{error}</div>}

      {confirmingAction === 'approve' && (
        <div className="payroll-confirm">
          <p>Approve this run? Entries can no longer be adjusted after this.</p>
          <div className="payroll-confirm-actions">
            <button type="button" className="payroll-btn-secondary" onClick={() => setConfirmingAction(null)} disabled={actionBusy}>Cancel</button>
            <button type="button" className="payroll-btn-primary" onClick={() => runAction('approve')} disabled={actionBusy}>
              {actionBusy ? 'Approving...' : 'Yes, approve'}
            </button>
          </div>
        </div>
      )}

      {confirmingAction === 'pay' && (
        <div className="payroll-confirm">
          <p><strong>Mark this run as paid?</strong> This is the final step and cannot be undone.</p>
          <div className="payroll-confirm-actions">
            <button type="button" className="payroll-btn-secondary" onClick={() => setConfirmingAction(null)} disabled={actionBusy}>Cancel</button>
            <button type="button" className="payroll-btn-primary" onClick={() => runAction('pay')} disabled={actionBusy}>
              {actionBusy ? 'Marking as paid...' : 'Yes, mark as paid'}
            </button>
          </div>
        </div>
      )}

      <div className="payroll-entries-table">
        <div className="payroll-entry-row payroll-entry-header">
          <span>Staff</span>
          <span>Bank Account</span>
          <span>Account Number</span>
          <span>Base Salary</span>
          <span>Adjustment</span>
          <span>Total</span>
          <span></span>
        </div>
        {entries.map((entry) => (
          <div key={entry._id} className="payroll-entry-row">
            <span className="payroll-entry-name">
              {entry.staffNameSnapshot}
              {entry.staff?.role && <span className="payroll-entry-role">{entry.staff.role}</span>}
            </span>
            <span className="payroll-bank-info">{entry.staff?.bankAccount || <span className="payroll-muted">Not set</span>}</span>
            <span className="payroll-bank-info">{entry.staff?.accountNumber || <span className="payroll-muted">Not set</span>}</span>
            <span>{formatCurrency(entry.baseSalary)}</span>
            <span>
              {editingId === entry._id ? (
                <div className="payroll-edit-fields">
                  <div className="payroll-adjustment-type">
                    <label>
                      <input
                        type="radio"
                        name={`type-${entry._id}`}
                        value="increase"
                        checked={adjustmentType === 'increase'}
                        onChange={(e) => setAdjustmentType(e.target.value)}
                      />
                      <span className="payroll-type-label payroll-type-increase">+ Increase</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`type-${entry._id}`}
                        value="deduction"
                        checked={adjustmentType === 'deduction'}
                        onChange={(e) => setAdjustmentType(e.target.value)}
                      />
                      <span className="payroll-type-label payroll-type-deduction">− Deduction</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                  />
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Reason (required)"
                  />
                </div>
              ) : entry.adjustmentAmount ? (
                <span title={entry.adjustmentNote || ''} className={entry.adjustmentAmount > 0 ? 'payroll-adjustment-positive' : 'payroll-adjustment-negative'}>
                  {entry.adjustmentAmount > 0 ? '+' : ''}{formatCurrency(entry.adjustmentAmount)}
                </span>
              ) : (
                <span className="payroll-muted">&mdash;</span>
              )}
            </span>
            <span className="payroll-entry-total">{formatCurrency(entry.totalAmount)}</span>
            <span>
              {isPending && (
                editingId === entry._id ? (
                  <div className="payroll-edit-actions">
                    <button type="button" className="payroll-btn-secondary" onClick={() => setEditingId(null)} disabled={saving}>Cancel</button>
                    <button type="button" className="payroll-btn-primary" onClick={() => saveAdjustment(entry._id)} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <button type="button" className="payroll-link-btn" onClick={() => startEditing(entry)}>
                    Adjust
                  </button>
                )
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PayrollRunDetail;