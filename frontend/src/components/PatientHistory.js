import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import Hint from './Hint';
import './PatientHistory.css';

const STAGE_LABELS = {
  waiting_for_file: 'Finding file',
  with_doctor: 'With doctor',
  needs_recording: 'On the desk',
  filed: 'Put away'
};

const PatientHistory = () => {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`/api/visits/patient/${patientId}`);
      setPatient(response.data.patient);
      // Sort newest first
      const sortedVisits = (response.data.visits || []).sort(
        (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
      );
      setVisits(sortedVisits);
    } catch (err) {
      console.error('Failed to fetch patient history:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load patient history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const lagosOptions = { 
      timeZone: 'Africa/Lagos',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    return date.toLocaleDateString('en-US', lagosOptions);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const lagosOptions = { 
      timeZone: 'Africa/Lagos',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleTimeString('en-US', lagosOptions);
  };

  const formatVitals = (visit) => {
    if (visit.vitalsNotTaken) {
      return 'Check-in not taken';
    }
    if (visit.vitals?.systolic !== undefined && visit.vitals?.diastolic !== undefined && visit.vitals?.heartRate !== undefined) {
      return `BP ${visit.vitals.systolic}/${visit.vitals.diastolic} • HR ${visit.vitals.heartRate}`;
    }
    return '—';
  };

  if (loading) {
    return (
      <div className="patient-history">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading patient history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="patient-history">
        <div className="alert alert-error">{error}</div>
        <Link to="/patients" className="btn btn-outline">Back to Patient List</Link>
      </div>
    );
  }

  return (
    <div className="patient-history">
      <div className="history-header">
        <div>
          <h2 className="history-title">Visit History</h2>
          {patient && (
            <div className="patient-header-info">
              <p className="patient-name">{patient.fullName}</p>
              <p className="patient-id">Patient {patient.patientId}</p>
            </div>
          )}
        </div>
        <Link to="/patients" className="btn btn-outline">
          Back to Patient List
        </Link>
      </div>

      <Hint
        hintId="patient-history-view"
        message="View all visits for this patient. Click any row to see details or continue an open visit."
      />

      {visits.length === 0 ? (
        <div className="empty-state">
          <p>No visits yet. <Link to={`/visit?patientId=${patientId}`} className="link">Start one from Visit.</Link></p>
        </div>
      ) : (
        <div className="history-card">
          <table className="visits-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Check-in</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => {
                const isOpen = visit.isOpen;
                const destination = isOpen 
                  ? `/visits/${visit._id}`
                  : `/patients/${patientId}/visit/${visit._id}`;
                
                return (
                  <tr key={visit._id}>
                    <td className="col-date">
                      <div className="date-block">
                        <div className="date-value">{formatDate(visit.startedAt)}</div>
                        <div className="time-value">{formatTime(visit.startedAt)}</div>
                      </div>
                    </td>
                    <td className="col-status">
                      <span className={`status-pill status-pill-${visit.stage}`}>
                        {STAGE_LABELS[visit.stage] || visit.stage}
                      </span>
                    </td>
                    <td className="col-vitals">
                      {formatVitals(visit)}
                    </td>
                    <td className="col-notes">
                      {visit.stage === 'filed' && visit.filedBy ? (
                        <span className="note-text">Filed by {visit.filedBy.fullName}</span>
                      ) : (
                        <span className="note-text" style={{ color: 'var(--gray-500)' }}>—</span>
                      )}
                    </td>
                    <td className="col-action">
                      <Link to={destination} className="btn btn-outline btn-small">
                        {isOpen ? 'Continue' : 'View'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PatientHistory;
