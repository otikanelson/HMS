import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Payroll.css';

// TODO(Kiro): swap to the shared API client if raw axios isn't the
// established pattern elsewhere — same note as every other recent file.

// TODO: confirm actual currency — defaulting to Naira given context, easy
// to change to whatever's correct.
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', paid: 'Paid' };

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

async function fetchRuns() {
  const res = await axios.get('/api/payroll/runs');
  return res.data;
}

async function createRun(periodMonth, periodYear) {
  const res = await axios.post('/api/payroll/runs', { periodMonth, periodYear });
  return res.data;
}

const PayrollRunsList = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRuns(await fetchRuns());
    } catch (err) {
      setError("We couldn't load payroll runs. Try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { run } = await createRun(Number(newMonth), Number(newYear));
      navigate(`/payroll/${run._id}`);
    } catch (err) {
      setError(err.response?.data?.error || "That run couldn't be created. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="payroll-page">
      <div className="payroll-header">
        <div>
          <h1>Payroll</h1>
          <p className="payroll-subtitle">Create and manage pay periods.</p>
        </div>
        {!creating && (
          <button type="button" className="payroll-btn-primary" onClick={() => setCreating(true)}>
            + New Payroll Run
          </button>
        )}
      </div>

      {error && <div className="payroll-error">{error}</div>}

      {creating && (
        <div className="payroll-create-form">
          <div className="payroll-create-fields">
            <label>
              Month
              <select value={newMonth} onChange={(e) => setNewMonth(e.target.value)}>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Year
              <input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                min="2020"
                max="2100"
              />
            </label>
          </div>
          <div className="payroll-create-actions">
            <button
              type="button"
              className="payroll-btn-secondary"
              onClick={() => setCreating(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="payroll-btn-primary"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Run'}
            </button>
          </div>
          <p className="payroll-create-hint">
            This will automatically include every currently active staff member at their current salary.
          </p>
        </div>
      )}

      {loading ? (
        <p className="payroll-status-text">Loading payroll runs...</p>
      ) : runs.length === 0 ? (
        <p className="payroll-status-text">No payroll runs yet. Create the first one above.</p>
      ) : (
        <div className="payroll-runs-list">
          {runs.map((run) => (
            <div
              key={run._id}
              className="payroll-run-row"
              onClick={() => navigate(`/payroll/${run._id}`)}
            >
              <div className="payroll-run-main">
                <span className="payroll-run-period">{run.periodLabel}</span>
                <span className={`payroll-status-badge payroll-status-${run.status}`}>
                  {STATUS_LABELS[run.status]}
                </span>
              </div>
              <div className="payroll-run-meta">
                <span>{run.entryCount} staff</span>
                <span className="payroll-run-total">{formatCurrency(run.totalAmount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PayrollRunsList;