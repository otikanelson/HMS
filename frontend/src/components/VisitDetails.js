import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './VisitDetails.css';

const STAGE_LABELS = {
  waiting_for_file: 'Finding file',
  with_doctor: 'With doctor',
  needs_recording: 'File back - needs recording',
  filed: 'Done - file back in cabinet'
};

const VisitDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const [showConfirmPanel, setShowConfirmPanel] = useState(false);

  // Check-in form
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [notTaken, setNotTaken] = useState(false);
  const [reason, setReason] = useState('');

  // Recording form
  const [tests, setTests] = useState(['']);
  const [testsNone, setTestsNone] = useState(false);
  const [medications, setMedications] = useState(['']);
  const [medicationsNone, setMedicationsNone] = useState(false);
  const [notes, setNotes] = useState('');

  const [validationErrors, setValidationErrors] = useState({});

  const isAdmin = user?.accessLevel === 'ADMINISTRATOR';

  useEffect(() => {
    fetchVisit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`/api/visits/${id}`);
      const visitData = response.data.visit;
      setVisit(visitData);

      // Initialize form from visit data
      if (visitData.vitals && visitData.vitals.systolic !== undefined) {
        setSystolic(visitData.vitals.systolic.toString());
        setDiastolic(visitData.vitals.diastolic.toString());
        setHeartRate(visitData.vitals.heartRate.toString());
      }
      if (visitData.vitalsNotTaken) {
        setNotTaken(true);
        setReason(visitData.vitalsNotTakenReason || '');
      }
      
      if (visitData.tests && visitData.tests.length > 0) {
        setTests(visitData.tests);
      }
      setTestsNone(visitData.testsNone || false);
      
      if (visitData.medications && visitData.medications.length > 0) {
        setMedications(visitData.medications);
      }
      setMedicationsNone(visitData.medicationsNone || false);
      
      setNotes(visitData.notes || '');

    } catch (err) {
      console.error('Failed to fetch visit:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCheckin = async () => {
    try {
      setSaving(true);
      setError('');
      setValidationErrors({});

      const payload = notTaken
        ? { notTaken: true, reason }
        : { systolic, diastolic, heartRate };

      await axios.put(`/api/visits/${id}/vitals`, payload);
      setSaveSuccess('Check-in saved.');
      await fetchVisit();

      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Save check-in error:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to save check-in';
      setValidationErrors({ checkin: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const handleSendToDoctor = async () => {
    try {
      setSaving(true);
      setError('');
      await axios.post(`/api/visits/${id}/send-to-doctor`, { nameMatches: true });
      setSaveSuccess('Patient sent to doctor.');
      setShowConfirmPanel(false);
      await fetchVisit();
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Send to doctor error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to send to doctor');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndFile = async () => {
    try {
      setSaving(true);
      setError('');
      setValidationErrors({});

      // Clean and prepare tests
      const cleanedTests = tests.map(t => t.trim()).filter(t => t.length > 0);
      
      // Clean and prepare medications
      const cleanedMeds = medications.map(m => m.trim()).filter(m => m.length > 0);

      const payload = {
        tests: cleanedTests,
        testsNone,
        medications: cleanedMeds,
        medicationsNone,
        notes: notes.trim()
      };

      await axios.put(`/api/visits/${id}/record`, payload);
      setSaveSuccess(`Saved. Put the paper file back in ${visit.currentLocation}.`);
      await fetchVisit();
    } catch (err) {
      console.error('Save and file error:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to file visit';
      setValidationErrors({ general: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const handleCorrect = async () => {
    if (!window.confirm('This will change a finished record. The change will be logged.')) return;

    try {
      setSaving(true);
      setError('');
      setValidationErrors({});

      const cleanedTests = tests.map(t => t.trim()).filter(t => t.length > 0);
      const cleanedMeds = medications.map(m => m.trim()).filter(m => m.length > 0);

      const payload = {
        tests: cleanedTests,
        testsNone,
        medications: cleanedMeds,
        medicationsNone,
        notes: notes.trim()
      };

      // Include vitals if changed
      if (notTaken) {
        payload.notTaken = true;
        payload.reason = reason;
      } else if (systolic && diastolic && heartRate) {
        payload.vitals = { systolic, diastolic, heartRate };
      }

      await axios.put(`/api/visits/${id}/correct`, payload);
      setSaveSuccess('Visit corrected.');
      await fetchVisit();
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Correct error:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to correct visit';
      setValidationErrors({ general: errorMsg });
    } finally {
      setSaving(false);
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
      <div className="visit-details">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading visit details...</p>
        </div>
      </div>
    );
  }

  if (error && !visit) {
    return (
      <div className="visit-details">
        <div className="alert alert-error">{error}</div>
        <Link to="/file-desk" className="btn btn-outline">Back to File Desk</Link>
      </div>
    );
  }

  const hasCheckin = (visit.vitals && visit.vitals.systolic !== undefined) || visit.vitalsNotTaken;
  const isFiled = visit.stage === 'filed';
  const canEdit = !isFiled || isAdmin;

  return (
    <div className="visit-details">
      <div className="visit-header">
        <div>
          <h2 className="visit-title">Visit Details</h2>
          <div className="visit-meta">
            <p><strong>{visit.patientName}</strong> • Patient {visit.patientId}</p>
            <p className="visit-location">{visit.currentLocation}</p>
            <p className="stage-chip">{STAGE_LABELS[visit.stage]}</p>
            <p className="visit-date">Started {formatDate(visit.startedAt)}</p>
          </div>
        </div>
        <Link to="/file-desk" className="btn btn-outline">
          Back to File Desk
        </Link>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {saveSuccess && (
        <div className="alert alert-success">
          {saveSuccess}
          {isFiled && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <Link to="/file-desk" className="link">Return to File Desk</Link>
            </div>
          )}
        </div>
      )}

      {validationErrors.general && (
        <div className="alert alert-error">{validationErrors.general}</div>
      )}

      <div className="visit-form">
        {/* Section 1: Check-in */}
        <div className="form-section">
          <h3>Check-in</h3>
          
          {validationErrors.checkin && (
            <div className="alert alert-error">{validationErrors.checkin}</div>
          )}

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="systolic">Top number (mmHg)</label>
              <input
                id="systolic"
                type="number"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                disabled={!canEdit || notTaken}
                placeholder="120"
              />
            </div>
            <div className="form-field">
              <label htmlFor="diastolic">Bottom number (mmHg)</label>
              <input
                id="diastolic"
                type="number"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                disabled={!canEdit || notTaken}
                placeholder="80"
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="heartRate">Heart rate (bpm)</label>
            <input
              id="heartRate"
              type="number"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              disabled={!canEdit || notTaken}
              placeholder="72"
              style={{ maxWidth: '200px' }}
            />
          </div>

          <div className="form-field" style={{ marginTop: 'var(--space-3)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: canEdit ? 'pointer' : 'not-allowed' }}>
              <input
                type="checkbox"
                checked={notTaken}
                onChange={(e) => {
                  setNotTaken(e.target.checked);
                  if (e.target.checked) {
                    setSystolic('');
                    setDiastolic('');
                    setHeartRate('');
                  } else {
                    setReason('');
                  }
                }}
                disabled={!canEdit}
              />
              <span>Couldn't be taken</span>
            </label>
            {notTaken && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why couldn't the vitals be taken?"
                rows={2}
                maxLength={200}
                disabled={!canEdit}
                style={{ marginTop: 'var(--space-2)' }}
              />
            )}
          </div>

          {!isFiled && (
            <button onClick={handleSaveCheckin} className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save check-in'}
            </button>
          )}

          {/* Send to doctor - only when waiting_for_file and checkin done */}
          {visit.stage === 'waiting_for_file' && hasCheckin && !showConfirmPanel && (
            <button onClick={() => setShowConfirmPanel(true)} className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }}>
              File found - send to doctor
            </button>
          )}

          {visit.stage === 'waiting_for_file' && !hasCheckin && (
            <p style={{ marginTop: 'var(--space-3)', fontSize: '0.875rem', color: 'var(--gray-600)', fontStyle: 'italic' }}>
              Save check-in first, then you can send the patient to the doctor.
            </p>
          )}

          {showConfirmPanel && (
            <div className="confirm-panel">
              <p className="confirm-panel-text">
                <strong>Name on the paper file:</strong><br />
                <span style={{ fontSize: '1.5rem' }}>{visit.patientName}</span>
              </p>
              <p className="confirm-panel-question">Does it match?</p>
              <div className="confirm-panel-actions">
                <button onClick={() => setShowConfirmPanel(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button onClick={handleSendToDoctor} className="btn btn-primary" disabled={saving}>
                  {saving ? 'Sending...' : 'Yes, it matches - send to doctor'}
                </button>
              </div>
            </div>
          )}

          {visit.stage === 'with_doctor' && (
            <p style={{ marginTop: 'var(--space-3)', fontSize: '0.875rem', color: 'var(--gray-600)', fontStyle: 'italic' }}>
              Patient is with the doctor. Mark the file as back when they return.
            </p>
          )}
        </div>

        {/* Section 2: After consultation */}
        <div className="form-section">
          <h3>After consultation</h3>

          {visit.stage !== 'needs_recording' && visit.stage !== 'filed' ? (
            <p className="section-disabled-message">Available once the file is back</p>
          ) : (
            <>
              <div className="form-field">
                <label>Tests</label>
                {tests.map((test, index) => (
                  <div key={index} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <input
                      type="text"
                      value={test}
                      onChange={(e) => {
                        const newTests = [...tests];
                        newTests[index] = e.target.value;
                        setTests(newTests);
                      }}
                      disabled={!canEdit}
                      placeholder="Test name and result"
                      maxLength={200}
                      style={{ flex: 1 }}
                    />
                    {canEdit && tests.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTests(tests.filter((_, i) => i !== index))}
                        className="btn-remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setTests([...tests, ''])}
                    className="btn btn-outline btn-small"
                    style={{ marginTop: 'var(--space-2)' }}
                  >
                    + Add another
                  </button>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', cursor: canEdit ? 'pointer' : 'not-allowed' }}>
                  <input
                    type="checkbox"
                    checked={testsNone}
                    onChange={(e) => setTestsNone(e.target.checked)}
                    disabled={!canEdit}
                  />
                  <span>No tests</span>
                </label>
              </div>

              <div className="form-field">
                <label>Medicines</label>
                {medications.map((med, index) => (
                  <div key={index} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <input
                      type="text"
                      value={med}
                      onChange={(e) => {
                        const newMeds = [...medications];
                        newMeds[index] = e.target.value;
                        setMedications(newMeds);
                      }}
                      disabled={!canEdit}
                      placeholder="Medicine, dose, frequency, duration"
                      maxLength={200}
                      style={{ flex: 1 }}
                    />
                    {canEdit && medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMedications(medications.filter((_, i) => i !== index))}
                        className="btn-remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setMedications([...medications, ''])}
                    className="btn btn-outline btn-small"
                    style={{ marginTop: 'var(--space-2)' }}
                  >
                    + Add another
                  </button>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', cursor: canEdit ? 'pointer' : 'not-allowed' }}>
                  <input
                    type="checkbox"
                    checked={medicationsNone}
                    onChange={(e) => setMedicationsNone(e.target.checked)}
                    disabled={!canEdit}
                  />
                  <span>No medicines</span>
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Any additional notes..."
                  rows={4}
                  maxLength={1000}
                />
                {canEdit && (
                  <span className="char-count">{notes.length}/1000</span>
                )}
              </div>

              {visit.stage === 'needs_recording' && (
                <button onClick={handleSaveAndFile} className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save and file'}
                </button>
              )}

              {isFiled && (
                <div className="filed-notice">
                  <p>
                    Filed by {visit.filedBy?.fullName || 'Unknown'} on {formatDate(visit.filedAt)}
                  </p>
                  {visit.lastEditedBy && (
                    <p style={{ marginTop: 'var(--space-1)', fontSize: '0.875rem', color: 'var(--warning-600)', fontStyle: 'italic' }}>
                      Last edited by {visit.lastEditedBy.fullName} on {formatDate(visit.lastEditedAt)}
                    </p>
                  )}
                  {isAdmin && (
                    <button onClick={handleCorrect} className="btn btn-outline" style={{ marginTop: 'var(--space-3)' }}>
                      Correct
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitDetails;
