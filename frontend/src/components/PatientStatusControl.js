import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './PatientStatusControl.css';

// TODO(Kiro): swap to whatever shared API client this codebase already
// uses elsewhere (same note as in WeeklySchedule.js) if it's not raw axios.

const STATUS_LABELS = {
  admitted: 'Admitted',
  discharged: 'Discharged',
  archived: 'Archived',
};

async function updatePatientStatus(patientId, status) {
  const res = await axios.put(`/api/patients/${patientId}/status`, { status });
  return res.data;
}

async function deletePatient(patientId) {
  const res = await axios.delete(`/api/patients/${patientId}`);
  return res.data;
}

/**
 * Read-only pill — use this in list rows where space is tight.
 */
export const PatientStatusBadge = ({ status }) => (
  <span className={`patient-status-badge patient-status-${status}`}>
    {STATUS_LABELS[status] || status}
  </span>
);

/**
 * Badge + role-appropriate action buttons — use this in a patient detail
 * view or an expanded list row. Calls onChanged(updatedPatient) after any
 * successful action so the parent can refresh its data; calls onDeleted()
 * after a successful permanent delete so the parent can remove the row.
 */
const PatientStatusControl = ({ patient, onChanged, onDeleted }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmingAction, setConfirmingAction] = useState(null); // 'archive' | 'delete' | null

  const accessLevel = user?.accessLevel;
  const canAdmitDischarge = ['ADMINISTRATOR', 'RECORDS_OPERATOR', 'CLINICAL_STAFF'].includes(accessLevel);
  const canArchive = ['ADMINISTRATOR', 'RECORDS_OPERATOR'].includes(accessLevel);
  const canDelete = accessLevel === 'ADMINISTRATOR';

  const runStatusChange = async (newStatus) => {
    setLoading(true);
    setError('');
    try {
      const updated = await updatePatientStatus(patient.patientId, newStatus);
      onChanged?.(updated.patient);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
          "That change didn't go through. Please try again."
      );
    } finally {
      setLoading(false);
      setConfirmingAction(null);
    }
  };

  const runDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await deletePatient(patient.patientId);
      onDeleted?.(patient.patientId);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
          "This file couldn't be deleted. Please try again."
      );
      setLoading(false);
      setConfirmingAction(null);
    }
  };

  return (
    <div className="patient-status-control">
      <div className="patient-status-row">
        <PatientStatusBadge status={patient.status} />
        {error && <span className="patient-status-error">{error}</span>}
      </div>

      <div className="patient-status-actions">
        {/* Discharged: can admit, can archive */}
        {patient.status === 'discharged' && (
          <>
            {canAdmitDischarge && (
              <button
                type="button"
                className="status-btn status-btn-primary"
                disabled={loading}
                onClick={() => runStatusChange('admitted')}
              >
                Admit Patient
              </button>
            )}
            {canArchive && (
              <button
                type="button"
                className="status-btn status-btn-secondary"
                disabled={loading}
                onClick={() => setConfirmingAction('archive')}
              >
                Archive
              </button>
            )}
          </>
        )}

        {/* Admitted: can discharge */}
        {patient.status === 'admitted' && canAdmitDischarge && (
          <button
            type="button"
            className="status-btn status-btn-secondary"
            disabled={loading}
            onClick={() => runStatusChange('discharged')}
          >
            Discharge Patient
          </button>
        )}

        {/* Archived: can reactivate (back to discharged) */}
        {patient.status === 'archived' && canArchive && (
          <button
            type="button"
            className="status-btn status-btn-primary"
            disabled={loading}
            onClick={() => runStatusChange('discharged')}
          >
            Reactivate
          </button>
        )}

        {/* Administrator: always available */}
        {canDelete && (
          <button
            type="button"
            className="status-btn status-btn-danger"
            disabled={loading}
            onClick={() => setConfirmingAction('delete')}
          >
            Delete Permanently
          </button>
        )}
      </div>

      {confirmingAction === 'archive' && (
        <div className="patient-status-confirm">
          <p>
            Archive this file? It will be hidden from normal search until
            someone reactivates it. Nothing is deleted.
          </p>
          <div className="patient-status-confirm-actions">
            <button
              type="button"
              className="status-btn status-btn-secondary"
              onClick={() => setConfirmingAction(null)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="status-btn status-btn-primary"
              onClick={() => runStatusChange('archived')}
              disabled={loading}
            >
              {loading ? 'Archiving...' : 'Yes, archive it'}
            </button>
          </div>
        </div>
      )}

      {confirmingAction === 'delete' && (
        <div className="patient-status-confirm">
          <p>
            <strong>Permanently delete this file?</strong> This cannot be
            undone — the record and its full location history will be gone
            for good.
          </p>
          <div className="patient-status-confirm-actions">
            <button
              type="button"
              className="status-btn status-btn-secondary"
              onClick={() => setConfirmingAction(null)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="status-btn status-btn-danger"
              onClick={runDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Yes, delete permanently'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientStatusControl;