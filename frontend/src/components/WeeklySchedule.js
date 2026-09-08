import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './WeeklySchedule.css';

const DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const DAY_KEYS_BY_JS_GETDAY = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

const SHIFT_LABELS = { day: 'Day', night: 'Night', off: 'Off' };
 
function todayKey() {
  return DAY_KEYS_BY_JS_GETDAY[new Date().getDay()];
}

async function fetchScheduleOverview() {
  const res = await axios.get('/api/staff/schedule');
  return res.data;
}

async function updateStaffSchedule(staffId, WeeklySchedule) {
  const res = await axios.put(`/api/staff/${staffId}/schedule`, { WeeklySchedule });
  return res.data;
}

const WeeklySchedule = () => {
  const { user } = useAuth();
  const canEdit = user?.accessLevel === 'ADMINISTRATOR';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingChanges, setPendingChanges] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const today = todayKey();

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchScheduleOverview();
      setRows(data);
    } catch (err) {
      setError("We couldn't load the schedule. Try refreshing the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleCellChange = (staffId, dayKey, newValue) => {
    const rowIndex = rows.findIndex((r) => r.staffId === staffId);
    if (rowIndex === -1) return;

    const previousSchedule = rows[rowIndex].WeeklySchedule;
    const updatedSchedule = { ...previousSchedule, [dayKey]: newValue };

    // Optimistic update
    setRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], WeeklySchedule: updatedSchedule };
      return next;
    });

    // Track pending change
    setPendingChanges((prev) => ({
      ...prev,
      [staffId]: updatedSchedule,
    }));

    setError('');
    setSaveSuccess(false);
  };

  const handleSaveSchedule = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      // Save changes sequentially to avoid race conditions with token refresh
      for (const [staffId, schedule] of Object.entries(pendingChanges)) {
        await updateStaffSchedule(staffId, schedule);
      }

      setPendingChanges({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Changes didn't save. Please try again."
      );
      // Reload schedule on error to ensure UI is in sync
      loadSchedule();
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="schedule-panel">
        <div className="schedule-heading">
          <h2>Weekly Schedule</h2>
        </div>
        <p className="schedule-status-text">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="schedule-panel">
      <div className="schedule-heading">
        <h2>Weekly Schedule</h2>
        {!canEdit && <span className="schedule-readonly-tag">View only</span>}
        {canEdit && Object.keys(pendingChanges).length > 0 && (
          <button
            onClick={handleSaveSchedule}
            disabled={isSaving}
            className="schedule-save-button"
          >
            {isSaving ? (
              'Saving...'
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                </svg>
                Save Schedule
              </>
            )}
          </button>
        )}
        {saveSuccess && (
          <span className="schedule-success-message">
            ✓ Schedule saved successfully
          </span>
        )}
      </div>

      {error && <div className="schedule-error">{error}</div>}

      {rows.length === 0 ? (
        <p className="schedule-status-text">No active staff to schedule yet.</p>
      ) : (
        <div className="schedule-scroll">
          <table className="schedule-grid">
            <thead>
              <tr>
                <th className="schedule-name-col">Staff</th>
                {DAYS.map((d) => (
                  <th
                    key={d.key}
                    className={d.key === today ? 'schedule-today-col' : ''}
                  >
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.staffId}>
                  <td className="schedule-name-col">
                    <div className="schedule-staff-name">{row.fullName}</div>
                    <div className="schedule-staff-role">{row.role}</div>
                  </td>
                  {DAYS.map((d) => {
                    const value = row.WeeklySchedule?.[d.key] || 'off';
                    const isTodayCol = d.key === today;

                    return (
                      <td
                        key={d.key}
                        className={`schedule-cell schedule-cell-${value} ${
                          isTodayCol ? 'schedule-today-col' : ''
                        }`}
                      >
                        {canEdit ? (
                          <div className="schedule-cell-edit">
                            <select
                              value={value}
                              onChange={(e) =>
                                handleCellChange(row.staffId, d.key, e.target.value)
                              }
                              disabled={isSaving}
                              className="schedule-select"
                              aria-label={`${row.fullName} — ${d.label}`}
                            >
                              <option value="day">Day</option>
                              <option value="night">Night</option>
                              <option value="off">Off</option>
                            </select>
                          </div>
                        ) : (
                          <span className="schedule-badge">{SHIFT_LABELS[value]}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WeeklySchedule;