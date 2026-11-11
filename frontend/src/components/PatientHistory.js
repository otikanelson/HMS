import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import './PatientHistory.css';

const STAGE_LABELS = {
  waiting_for_file: 'Finding file',
  with_doctor: 'With doctor',
  needs_recording: 'File back - needs recording',
  filed: 'Done - file back in cabinet'
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
      setVisits(response.data.visits);
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
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', lagosOptions);
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
      <div className="patient-history-header">
        <div>
          <h2 className="patient-history-title">Visit History</h2>
          {patient && (
            <div className="patient-info">
              <p className="patient-name">{patient.fullName}</p>
              <p className="patient-id">Patient {patient.patientId}</p>
            </div>
          )}
        </div>
        <Link to="/patients" className="btn btn-outline">
          Back to Patient List
        </Link>
      </div>

      {visits.length === 0 ? (
        <div className="empty-state">
          <p>No visits recorded yet</p>
        </div>
      ) : (
        <div className="visits-list">
          {visits.map((visit) => {
            const isFiled = visit.stage === 'filed';

            return (
              <div key={visit._id} className="visit-card">
                <div className="visit-card-header">
                  <span className="visit-card-date">{formatDate(visit.startedAt)}</span>
                  {!isFiled && (
                    <span className="visit-status-badge pending">
                      Not filed yet - {STAGE_LABELS[visit.stage]}
                    </span>
                  )}
                </div>

                {!isFiled ? (
                  <div className="visit-card-body">
                    <p className="visit-pending-text">
                      This visit has not been filed yet. Current stage: {STAGE_LABELS[visit.stage]}
                    </p>
                    <Link to={`/visits/${visit._id}`} className="btn btn-primary btn-small">
                      Open visit
                    </Link>
                  </div>
                ) : (
                  <div className="visit-card-body">
                    {/* Vitals */}
                    <div className="visit-detail-section">
                      <h4>Check-in</h4>
                      {visit.vitalsNotTaken ? (
                        <p><strong>Not taken:</strong> {visit.vitalsNotTakenReason}</p>
                      ) : visit.vitals && visit.vitals.systolic ? (
                        <>
                          <p><strong>BP:</strong> {visit.vitals.systolic}/{visit.vitals.diastolic} mmHg</p>
                          <p><strong>Heart rate:</strong> {visit.vitals.heartRate} bpm</p>
                        </>
                      ) : null}
                    </div>

                    {/* Tests */}
                    {visit.testsNone ? (
                      <div className="visit-detail-section">
                        <h4>Tests</h4>
                        <p>None</p>
                      </div>
                    ) : visit.tests && visit.tests.length > 0 ? (
                      <div className="visit-detail-section">
                        <h4>Tests</h4>
                        <ul className="visit-list">
                          {visit.tests.map((test, index) => (
                            <li key={index}>{test}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {/* Medications */}
                    {visit.medicationsNone ? (
                      <div className="visit-detail-section">
                        <h4>Medicines</h4>
                        <p>None</p>
                      </div>
                    ) : visit.medications && visit.medications.length > 0 ? (
                      <div className="visit-detail-section">
                        <h4>Medicines</h4>
                        <ul className="visit-list">
                          {visit.medications.map((med, index) => (
                            <li key={index}>{med}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {/* Notes */}
                    {visit.notes && (
                      <div className="visit-detail-section">
                        <h4>Notes</h4>
                        <p className="visit-notes">{visit.notes}</p>
                      </div>
                    )}

                    <div className="visit-card-footer">
                      <p className="visit-documented-by">
                        Filed by {visit.filedBy?.fullName || 'Unknown'}
                      </p>
                      {visit.lastEditedBy && (
                        <p className="visit-edited-note">
                          Last edited by {visit.lastEditedBy.fullName} on {formatDate(visit.lastEditedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PatientHistory;
