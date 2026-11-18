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
const PAYMENT_STATUS_LABELS = {
  not_sent: 'Not sent',
  sending: 'Sending…',
  success: 'Paid ✓',
  failed: 'Failed',
  reversed: 'Reversed'
};

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

async function payWithPaystack(id, password) {
  const res = await axios.post(`/api/payroll/runs/${id}/pay-with-paystack`, { password });
  return res.data;
}

async function retryFailedPayments(id, password) {
  const res = await axios.post(`/api/payroll/runs/${id}/retry-failed`, { password });
  return res.data;
}

async function syncPaymentStatus(id) {
  const res = await axios.post(`/api/payroll/runs/${id}/sync`);
  return res.data;
}

async function downloadPaymentFile(id) {
  const res = await axios.get(`/api/payroll/runs/${id}/payment-file`, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `payroll-payment.csv`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
}

async function checkPayment(id) {
  const res = await axios.get(`/api/payroll/runs/${id}/payment-check`);
  return res.data;
}

const PayrollPaymentModal = ({ run, onClose, onPaymentStarted }) => {
  const [step, setStep] = useState('check'); // 'check' | 'confirm' | 'sending'
  const [paymentCheck, setPaymentCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [retryingFailed, setRetryingFailed] = useState(false);

  useEffect(() => {
    const loadCheck = async () => {
      try {
        const check = await checkPayment(run._id);
        setPaymentCheck(check);
        if (!check.configured) {
          setError('Paystack is not set up yet');
        }
      } catch (err) {
        setError('Failed to check payment status');
      } finally {
        setLoading(false);
      }
    };
    loadCheck();
  }, [run._id]);

  const handleStartPayment = async () => {
    if (!password) {
      setPasswordError('Enter your password to confirm');
      return;
    }
    setPasswordError('');
    setStep('sending');
    setError('');

    try {
      const result = await payWithPaystack(run._id, password);
      
      if (result.problems && result.problems.length > 0) {
        setError(`Cannot start payment: ${result.problems[0].problem}`);
        setStep('check');
        setPassword('');
        return;
      }

      if (result.entries) {
        onPaymentStarted(result.entries);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed');
      setStep('check');
      setPassword('');
    }
  };

  const handleRetryFailed = async () => {
    if (!password) {
      setPasswordError('Enter your password to confirm');
      return;
    }
    setPasswordError('');
    setRetryingFailed(true);
    setError('');

    try {
      const result = await retryFailedPayments(run._id, password);
      if (result.entries) {
        onPaymentStarted(result.entries);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Retry failed');
    } finally {
      setRetryingFailed(false);
      setPassword('');
    }
  };

  if (loading) {
    return (
      <div className="payroll-modal-overlay" onClick={onClose}>
        <div className="payroll-modal-content" onClick={(e) => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!paymentCheck?.configured) {
    return (
      <div className="payroll-modal-overlay" onClick={onClose}>
        <div className="payroll-modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Automatic payment not set up</h2>
          <p>Paystack integration is not configured. You can still download the payment file for manual processing.</p>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="payroll-modal-overlay" onClick={onClose}>
      <div className="payroll-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="payroll-modal-close" onClick={onClose}>×</button>

        {step === 'check' && (
          <>
            <h2>Pay all staff</h2>

            <div className="payroll-payment-check">
              <div className="payroll-check-row">
                <span>Number of people:</span>
                <strong>{paymentCheck.count}</strong>
              </div>
              <div className="payroll-check-row">
                <span>Total amount:</span>
                <strong>{formatCurrency(paymentCheck.total)}</strong>
              </div>
              <div className="payroll-check-row">
                <span>Paystack balance:</span>
                <strong>{formatCurrency(paymentCheck.balance)}</strong>
              </div>
              <div className={`payroll-check-row ${paymentCheck.enough ? 'payroll-check-ok' : 'payroll-check-error'}`}>
                <span>Enough money:</span>
                <strong>{paymentCheck.enough ? 'Yes ✓' : `No — short by ₦${paymentCheck.shortBy}`}</strong>
              </div>
            </div>

            {paymentCheck.problems && paymentCheck.problems.length > 0 && (
              <div className="payroll-problems">
                <h3>Problems to fix:</h3>
                <ul>
                  {paymentCheck.problems.map((p, i) => (
                    <li key={i}>
                      <strong>{p.staffName}</strong> — {p.problem}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && <div className="payroll-error">{error}</div>}

            <div className="payroll-modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={() => setStep('confirm')}
                disabled={!paymentCheck.enough || (paymentCheck.problems && paymentCheck.problems.length > 0)}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <h2>Confirm payment</h2>
            <p>This will send ₦{paymentCheck.total.toLocaleString()} to {paymentCheck.count} staff accounts now. It cannot be undone.</p>

            <div className="payroll-modal-password">
              <label>Type your password to confirm:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleStartPayment()}
                placeholder="Your password"
              />
              {passwordError && <div className="payroll-error">{passwordError}</div>}
            </div>

            {error && <div className="payroll-error">{error}</div>}

            <div className="payroll-modal-actions">
              <button className="btn btn-secondary" onClick={() => { setStep('check'); setPassword(''); setError(''); }}>Back</button>
              <button 
                className="btn btn-primary" 
                onClick={handleStartPayment}
                disabled={!password}
              >
                Send ₦{formatCurrency(paymentCheck.total)} to {paymentCheck.count} people
              </button>
            </div>
          </>
        )}

        {step === 'sending' && (
          <>
            <h2>Processing payment...</h2>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
              <p>Payment is being sent. Please wait...</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const PayrollRunDetail = () => {
  const { id } = useParams();

  const [run, setRun] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('increase');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmingAction, setConfirmingAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [syncIntervalId, setSyncIntervalId] = useState(null);

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

  // Auto-sync payment status if in progress
  useEffect(() => {
    if (run?.paymentStatus === 'in_progress' && !syncIntervalId) {
      const interval = setInterval(async () => {
        try {
          const result = await syncPaymentStatus(id);
          setEntries(result.entries);

          // Check if all are done
          const allDone = result.entries.every(e => 
            e.status === 'success' || e.status === 'failed' || e.status === 'reversed'
          );

          if (allDone) {
            clearInterval(interval);
            setSyncIntervalId(null);
            // Reload to get updated run status
            load();
          }
        } catch (err) {
          console.error('Sync error:', err);
        }
      }, 10000); // 10 seconds

      setSyncIntervalId(interval);
    }

    return () => {
      if (syncIntervalId) clearInterval(syncIntervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.paymentStatus]);

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

  const handlePaymentStarted = (paymentEntries) => {
    setEntries(paymentEntries);
    load(); // Reload to get updated run status
  };

  const handleDownloadPaymentFile = async () => {
    try {
      await downloadPaymentFile(id);
    } catch (err) {
      setError('Failed to download payment file');
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
  const failedCount = entries.filter(e => e.payment?.status === 'failed' || e.payment?.status === 'reversed').length;
  const sendingCount = entries.filter(e => e.payment?.status === 'sending').length;

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
          {isApproved && run.paymentStatus !== 'in_progress' && (
            <>
              <button type="button" className="payroll-btn-primary" onClick={() => setShowPaymentModal(true)}>
                💳 Pay all staff
              </button>
              <button type="button" className="payroll-btn-secondary" onClick={() => setConfirmingAction('pay')}>
                I paid by bank transfer — mark as paid
              </button>
              <button type="button" className="payroll-btn-secondary" onClick={handleDownloadPaymentFile}>
                Download payment file (CSV)
              </button>
            </>
          )}
          {isApproved && run.paymentStatus === 'in_progress' && (
            <>
              <button type="button" className="payroll-btn-secondary" onClick={() => syncPaymentStatus(id)}>
                🔄 Refresh payment status
              </button>
              {failedCount > 0 && (
                <button type="button" className="payroll-btn-primary" onClick={() => {/* retry modal */}}>
                  ⚠️ Retry failed ({failedCount})
                </button>
              )}
            </>
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

      {showPaymentModal && run && (
        <PayrollPaymentModal 
          run={run} 
          onClose={() => setShowPaymentModal(false)}
          onPaymentStarted={handlePaymentStarted}
        />
      )}

      <div className="payroll-entries-table">
        <div className="payroll-entry-row payroll-entry-header">
          <span>Staff</span>
          <span>Bank Account</span>
          <span>Account Number</span>
          <span>Base Salary</span>
          <span>Adjustment</span>
          <span>Total</span>
          {run.paymentStatus === 'in_progress' && <span>Payment</span>}
          <span></span>
        </div>
        {entries.map((entry) => (
          <div key={entry._id} className="payroll-entry-row">
            <span className="payroll-entry-name">
              {entry.staffNameSnapshot}
              {entry.staff?.role && <span className="payroll-entry-role">{entry.staff.role}</span>}
            </span>
            <span className="payroll-bank-info">{entry.staff?.bankAccount || <span className="payroll-muted">Not set</span>}</span>
            <span className="payroll-bank-info">{entry.staff?.accountNumber ? `****${entry.staff.accountNumber.slice(-4)}` : <span className="payroll-muted">Not set</span>}</span>
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
            {run.paymentStatus === 'in_progress' && (
              <span className="payroll-payment-status">{PAYMENT_STATUS_LABELS[entry.payment?.status] || 'Not sent'}</span>
            )}
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
