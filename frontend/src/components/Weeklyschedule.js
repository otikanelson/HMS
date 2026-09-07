import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Weeklyschedule.css';

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

async function updateStaffSchedule(staffId, weeklySchedule) {
  const res = await axios.put(`/api/staff/${staffId}/schedule`, { weeklySchedule });
  return res.data;
}

const WeeklySchedule = () => {
  const { user } = useAuth();
  const canEdit = user?.accessLevel === 'ADMINISTRATOR';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingCell, setSavingCell] = useState(null);
  const [savedCell, setSavedCell] = useState(null);
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

  const handleCellChange = async (staffId, dayKey, newValue) => {
    const cellId = `${staffId}-${dayKey}`;
    const rowIndex = rows.findIndex((r) => r.staffId === staffId);
    if (rowIndex === -1) return;

    const previousSchedule = rows[rowIndex].weeklySchedule;
    const updatedSchedule = { ...previousSchedule, [dayKey]: newValue };

    // Optimistic update
    setRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], weeklySchedule: updatedSchedule };
      return next;
    });
    setSavingCell(cellId);
    setError('');

    try {
      await updateStaffSchedule(staffId, updatedSchedule);
      setSavedCell(cellId);
      setTimeout(() => setSavedCell((current) => (current === cellId ? null : current)), 1200);
    } catch (err) {
      // Revert on failure
      setRows((prev) => {
        const next = [...prev];
        next[rowIndex] = { ...next[rowIndex], weeklySchedule: previousSchedule };
        return next;
      });
      setError(
        err.response?.data?.error ||
          "That change didn't save. Please try again."
      );
    } finally {
      setSavingCell(null);
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
                    const value = row.weeklySchedule?.[d.key] || 'off';
                    const cellId = `${row.staffId}-${d.key}`;
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
                              disabled={savingCell === cellId}
                              className="schedule-select"
                              aria-label={`${row.fullName} — ${d.label}`}
                            >
                              <option value="day">Day</option>
                              <option value="night">Night</option>
                              <option value="off">Off</option>
                            </select>
                            {savedCell === cellId && (
                              <span className="schedule-saved-tick" aria-hidden="true">✓</span>
                            )}
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