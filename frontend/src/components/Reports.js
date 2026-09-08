import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Reports.css';

const ACTION_LABELS = {
  STAFF_CREATED: 'created a new staff record',
  STAFF_DEACTIVATED: 'deactivated a staff record',
  STAFF_SCHEDULE_UPDATED: 'updated a staff schedule',
  PATIENT_FILE_LOCATION_UPDATED: "updated a patient file's location",
  PATIENT_FILE_DELETED: 'permanently deleted a patient file',
  PATIENT_ADMITTED: 'admitted a patient',
  PATIENT_DISCHARGED: 'discharged a patient',
  PATIENT_ARCHIVED: 'archived a patient file',
  PATIENT_REACTIVATED: 'reactivated a patient file',
  NOTICE_CREATED: 'posted a notice',
  NOTICE_DELETED: 'removed a notice',
};

const ROLE_LABELS = {
  ADMINISTRATOR: 'Administrator',
  RECORDS_OPERATOR: 'Records Operator',
  CLINICAL_STAFF: 'Clinical Staff',
};

function describeAction(action) {
  return ACTION_LABELS[action] || action.toLowerCase().replace(/_/g, ' ');
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function fetchActivityLog(page, flaggedOnly) {
  const res = await axios.get('/api/activity-log', {
    params: { page, flaggedOnly: flaggedOnly || undefined },
  });
  return res.data;
}

async function setEntryFlag(id, flagged, reason) {
  const res = await axios.put(`/api/activity-log/${id}/flag`, { flagged, reason });
  return res.data;
}

const Reports = () => {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-row inline UI state: which row has its flag-reason box open, or
  // its unflag confirmation open.
  const [flaggingId, setFlaggingId] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [unflaggingId, setUnflaggingId] = useState(null);
  const [rowBusy, setRowBusy] = useState(null);

  const load = useCallback(async (targetPage, targetFlaggedOnly) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchActivityLog(targetPage, targetFlaggedOnly);
      setEntries(data.entries);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err) {
      setError("We couldn't load the activity log. Try refreshing the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1, flaggedOnly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flaggedOnly]);

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    load(nextPage, flaggedOnly);
  };

  const startFlagging = (entryId) => {
    setFlaggingId(entryId);
    setFlagReason('');
  };

  const submitFlag = async (entryId) => {
    if (!flagReason.trim()) return;
    setRowBusy(entryId);
    try {
      const updated = await setEntryFlag(entryId, true, flagReason.trim());
      setEntries((prev) => prev.map((e) => (e._id === entryId ? updated : e)));
      setFlaggingId(null);
      setFlagReason('');
    } catch (err) {
      setError(err.response?.data?.error || "That flag couldn't be saved. Please try again.");
    } finally {
      setRowBusy(null);
    }
  };

  const confirmUnflag = async (entryId) => {
    setRowBusy(entryId);
    try {
      const updated = await setEntryFlag(entryId, false);
      setEntries((prev) => prev.map((e) => (e._id === entryId ? updated : e)));
      setUnflaggingId(null);
    } catch (err) {
      setError(err.response?.data?.error || "That couldn't be updated. Please try again.");
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1>Reports</h1>
          <p className="reports-subtitle">
            A record of who did what, across the whole system.
          </p>
        </div>
        <label className="reports-flagged-toggle">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
          />
          <span>Flagged only</span>
        </label>
      </div>

      {error && <div className="reports-error">{error}</div>}

      {loading ? (
        <p className="reports-status-text">Loading activity...</p>
      ) : entries.length === 0 ? (
        <p className="reports-status-text">
          {flaggedOnly ? 'No flagged activity.' : 'No activity recorded yet.'}
        </p>
      ) : (
        <div className="reports-list">
          {entries.map((entry) => (
            <div key={entry._id} className={`report-row ${entry.flagged ? 'is-flagged' : ''}`}>
              <div className="report-row-main">
                <div className="report-row-text">
                  <span className="report-actor">{entry.actor?.fullName || 'Unknown user'}</span>
                  <span className="report-role-tag">
                    {ROLE_LABELS[entry.actorAccessLevel] || entry.actorAccessLevel}
                  </span>
                  <span className="report-action">{describeAction(entry.action)}</span>
                  {entry.targetLabel && (
                    <span className="report-target">— {entry.targetLabel}</span>
                  )}
                </div>
                <span className="report-time">{formatRelativeTime(entry.createdAt)}</span>
              </div>

              {entry.flagged && (
                <div className="report-flag-note">
                  <strong>Flagged</strong> by {entry.flaggedBy?.fullName || 'an administrator'}
                  {entry.flagReason ? `: "${entry.flagReason}"` : ''}
                </div>
              )}

              <div className="report-row-actions">
                {!entry.flagged && flaggingId !== entry._id && (
                  <button
                    type="button"
                    className="report-flag-btn"
                    onClick={() => startFlagging(entry._id)}
                  >
                    Flag
                  </button>
                )}
                {entry.flagged && unflaggingId !== entry._id && (
                  <button
                    type="button"
                    className="report-flag-btn"
                    onClick={() => setUnflaggingId(entry._id)}
                  >
                    Remove flag
                  </button>
                )}
              </div>

              {flaggingId === entry._id && (
                <div className="report-flag-form">
                  <textarea
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Why is this activity being flagged?"
                    maxLength={500}
                    rows={2}
                  />
                  <div className="report-flag-form-actions">
                    <button
                      type="button"
                      className="report-btn-secondary"
                      onClick={() => setFlaggingId(null)}
                      disabled={rowBusy === entry._id}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="report-btn-primary"
                      onClick={() => submitFlag(entry._id)}
                      disabled={rowBusy === entry._id || !flagReason.trim()}
                    >
                      {rowBusy === entry._id ? 'Flagging...' : 'Flag this activity'}
                    </button>
                  </div>
                </div>
              )}

              {unflaggingId === entry._id && (
                <div className="report-flag-form">
                  <p className="report-unflag-confirm-text">Remove this flag?</p>
                  <div className="report-flag-form-actions">
                    <button
                      type="button"
                      className="report-btn-secondary"
                      onClick={() => setUnflaggingId(null)}
                      disabled={rowBusy === entry._id}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="report-btn-primary"
                      onClick={() => confirmUnflag(entry._id)}
                      disabled={rowBusy === entry._id}
                    >
                      {rowBusy === entry._id ? 'Removing...' : 'Yes, remove flag'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="reports-pagination">
          <button
            type="button"
            className="report-btn-secondary"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span className="reports-page-indicator">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="report-btn-secondary"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Reports;