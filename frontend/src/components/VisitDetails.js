import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './VisitDetails.css';

const STAGE_ORDER = ['waiting_for_file', 'with_doctor', 'needs_recording', 'filed'];
const STAGE_STEP_NAMES = {
  waiting_for_file: 'BP and heart rate',
  with_doctor: 'With doctor',
  needs_recording: 'On the desk',
  filed: 'Put away'
};

const VisitDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Check-in form
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [notTaken, setNotTaken] = useState(false);
  const [reason, setReason] = useState('');

  // Recording form
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [tests, setTests] = useState(['']);
  const [testsNone, setTestsNone] = useState(false);
  const [medications, setMedications] = useState(['']);
  const [medicationsNone, setMedicationsNone] = useState(false);
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState('');
  const [recordedBy, setRecordedBy] = useState('');

  const [validationErrors, setValidationErrors] = useState({});
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [steppingBack, setSteppingBack] = useState(false);

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
      setChiefComplaint(visitData.chiefComplaint || '');
      setDiagnosis(visitData.diagnosis || '');
      setTreatmentPlan(visitData.treatmentPlan || '');
      setPayment(visitData.payment || '');
      // Set recordedBy: always use current user's username, or their full name if username not available
      const defaultRecordedBy = user?.username || user?.fullName || '';
      setRecordedBy(visitData.recordedBy || defaultRecordedBy);


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
        chiefComplaint,
        diagnosis,
        treatmentPlan,
        payment,
        recordedBy,
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
      
      // Map error messages to specific fields for better UX
      const errorMap = {
        'chief complaint': 'chiefComplaint',
        'diagnosis': 'diagnosis',
        'treatment plan': 'treatmentPlan',
        'payment': 'payment',
        'recorded by': 'recordedBy',
        'notes': 'notes'
      };
      
      let fieldError = null;
      for (const [key, field] of Object.entries(errorMap)) {
        if (errorMsg.toLowerCase().includes(key)) {
          fieldError = field;
          break;
        }
      }
      
      if (fieldError) {
        setValidationErrors({ [fieldError]: errorMsg });
      } else {
        setValidationErrors({ general: errorMsg });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      setCancelling(true);
      setError('');
      await axios.post(`/api/visits/${id}/cancel`);
      setSaveSuccess('Visit cancelled.');
      setTimeout(() => {
        window.location.href = '/file-desk';
      }, 1500);
    } catch (err) {
      console.error('Cancel visit error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to cancel visit');
    } finally {
      setCancelling(false);
    }
  };

  const handleStepBack = async () => {
    try {
      setSteppingBack(true);
      setError('');
      await axios.post(`/api/visits/${id}/step-back`);
      setSaveSuccess('Visit moved back one step.');
      await fetchVisit();
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Step back error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to step back');
    } finally {
      setSteppingBack(false);
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

  const getCurrentStageIndex = () => {
    return STAGE_ORDER.indexOf(visit.stage);
  };

  const isStageComplete = (stageKey) => {
    return STAGE_ORDER.indexOf(stageKey) < getCurrentStageIndex();
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

  return (
    <div className="visit-details">
      {/* Header with back button */}
      <div className="visit-header">
        <div>
          <h2 className="visit-title">{visit.patientName}</h2>
          <p className="visit-id">Patient {visit.patientId}</p>
          <p className="visit-date">Started {formatDate(visit.startedAt)}</p>
        </div>
        {visit.stage !== 'with_doctor' && (
          <Link to="/file-desk" className="btn btn-outline">
            Back to File Desk
          </Link>
        )}
      </div>

      {/* 4-Step Progress Strip */}
      <div className="progress-strip">
        {STAGE_ORDER.map((stageKey, index) => (
          <div
            key={stageKey}
            className={`progress-step ${visit.stage === stageKey ? 'progress-step-active' : ''} ${isStageComplete(stageKey) ? 'progress-step-complete' : ''}`}
          >
            <div className="progress-step-marker">{index + 1}</div>
            <div className="progress-step-label">{STAGE_STEP_NAMES[stageKey]}</div>
            {index < STAGE_ORDER.length - 1 && <div className="progress-step-line"></div>}
          </div>
        ))}
      </div>

      {/* Alert messages */}
      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {saveSuccess && (
        <div className="alert alert-success">
          {saveSuccess}
          {isFiled && (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
              <button 
                onClick={() => navigate(`/patients/${visit.patientId}/visit/${id}`)} 
                className="btn btn-primary btn-small"
              >
                View report
              </button>
              <Link to="/file-desk" className="btn btn-outline btn-small">
                Back to File Desk
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Single Card for Current Stage */}
      <div className="stage-card">
        {/* CHECK-IN STAGE */}
        {visit.stage === 'waiting_for_file' && (
          <>
            <div className="card-header">
              <h3>Step 1: Check-in</h3>
              <p className="card-help-text">Take the patient's vitals and confirm the file name matches.</p>
            </div>

            <div className="card-body">
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
                    onKeyDown={(e) => {
                      if (e.key === '/' || e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('diastolic').focus();
                      }
                    }}
                    disabled={notTaken}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('heartRate').focus();
                      }
                    }}
                    disabled={notTaken}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveCheckin();
                    }
                  }}
                  disabled={notTaken}
                  placeholder="72"
                  style={{ maxWidth: '200px' }}
                />
              </div>

              <div className="form-field" style={{ marginTop: 'var(--space-3)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
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
                    style={{ marginTop: 'var(--space-2)' }}
                  />
                )}
              </div>

              <div className="card-actions">
                <button onClick={handleSaveCheckin} className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save check-in'}
                </button>
                <button onClick={() => setShowCancelConfirm(true)} className="btn btn-outline" disabled={cancelling}>
                  {cancelling ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>

              {showCancelConfirm && (
                <div className="confirm-panel" style={{ marginTop: 'var(--space-3)' }}>
                  <p className="confirm-panel-text">
                    <strong>Cancel this visit?</strong>
                  </p>
                  <p className="confirm-panel-question">This will mark the visit as cancelled.</p>
                  <div className="confirm-panel-actions">
                    <button onClick={() => setShowCancelConfirm(false)} className="btn btn-outline" disabled={cancelling}>
                      Keep it
                    </button>
                    <button onClick={handleCancel} className="btn btn-primary" disabled={cancelling}>
                      {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm and send to doctor - single panel */}
              {hasCheckin && (
                <div 
                  className="confirm-panel" 
                  style={{ marginTop: 'var(--space-4)' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendToDoctor();
                    }
                  }}
                >
                  <p className="confirm-panel-text">
                    <strong>Confirm and send to doctor</strong>
                  </p>
                  <p style={{ fontSize: '0.95rem', color: 'var(--gray-700)', margin: '0 0 var(--space-3) 0', textAlign: 'center', lineHeight: 1.6 }}>
                    <strong>Patient name:</strong><br />
                    <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--gray-900)' }}>{visit.patientName}</span><br />
                    <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Located in: <strong>{visit.currentLocation}</strong></span>
                  </p>
                  <p className="confirm-panel-question">Does this match the paper file?</p>
                  <div className="confirm-panel-actions">
                    <button onClick={handleSendToDoctor} className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                      {saving ? 'Sending...' : 'Yes, send to doctor'}
                    </button>
                  </div>
                </div>
              )}

              {!hasCheckin && (
                <p style={{ marginTop: 'var(--space-3)', fontSize: '0.875rem', color: 'var(--gray-600)', fontStyle: 'italic' }}>
                    Save check-in first, then you can send the patient to the doctor.
                </p>
              )}
            </div>
          </>
        )}

        {/* WITH DOCTOR STAGE */}
        {visit.stage === 'with_doctor' && (
          <>
            <div className="card-header">
              <h3>Step 2: With Doctor</h3>
              <p className="card-help-text">Patient is being consulted. Mark the file as back when they return.</p>
            </div>

            <div className="card-body">
              <p style={{ fontSize: '0.95rem', color: 'var(--gray-700)', lineHeight: 1.6 }}>
                Patient vitals recorded on {formatDate(visit.startedAt)}.<br />
                <br />
                Waiting for doctor to complete consultation.
              </p>

              <div className="card-info-box">
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  When the doctor is done, tell them to return the paper file.
                </p>
              </div>

              <div className="card-actions">
                <button
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await axios.post(`/api/visits/${id}/file-back`);
                      setSaveSuccess('File marked as back. Ready to record.');
                      await fetchVisit();
                      setTimeout(() => setSaveSuccess(''), 3000);
                    } catch (err) {
                      setError(err.response?.data?.message || 'Failed to mark file back');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Updating...' : 'File is back'}
                </button>
                <button
                  onClick={handleStepBack}
                  className="btn btn-outline"
                  disabled={steppingBack}
                >
                  {steppingBack ? 'Going back...' : 'Go back'}
                </button>
                <Link to="/file-desk" className="btn btn-outline">
                  Back to File Desk
                </Link>
              </div>
            </div>
          </>
        )}

        {/* NEEDS RECORDING STAGE */}
        {visit.stage === 'needs_recording' && (
          <>
            <div className="card-header">
              <h3>Step 3: Record Consultation</h3>
              <p className="card-help-text">Write down what the doctor prescribed or noted.</p>
            </div>

            <div className="card-body">
              <div className="form-field">
                <label htmlFor="chiefComplaint">Chief complaint</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)', margin: '0 0 var(--space-1) 0' }}>Why the patient came.</p>
                <textarea
                  id="chiefComplaint"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Enter chief complaint"
                  rows={3}
                  maxLength={2000}
                />
                <span className="char-count">{chiefComplaint.length}/2000</span>
                {validationErrors.chiefComplaint && (
                  <div className="alert alert-error" style={{ marginTop: 'var(--space-2)' }}>{validationErrors.chiefComplaint}</div>
                )}
              </div>

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
                      placeholder="Test name and result"
                      maxLength={200}
                      style={{ flex: 1 }}
                    />
                    {tests.length > 1 && (
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
                <button
                  type="button"
                  onClick={() => setTests([...tests, ''])}
                  className="btn btn-outline btn-small"
                  style={{ marginTop: 'var(--space-2)' }}
                >
                  + Add test
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={testsNone}
                    onChange={(e) => setTestsNone(e.target.checked)}
                  />
                  <span>No tests</span>
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="diagnosis">Diagnosis</label>
                <textarea
                  id="diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Enter diagnosis"
                  rows={3}
                  maxLength={2000}
                />
                <span className="char-count">{diagnosis.length}/2000</span>
                {validationErrors.diagnosis && (
                  <div className="alert alert-error" style={{ marginTop: 'var(--space-2)' }}>{validationErrors.diagnosis}</div>
                )}
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
                      placeholder="Medicine, dose, frequency, duration"
                      maxLength={200}
                      style={{ flex: 1 }}
                    />
                    {medications.length > 1 && (
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
                <button
                  type="button"
                  onClick={() => setMedications([...medications, ''])}
                  className="btn btn-outline btn-small"
                  style={{ marginTop: 'var(--space-2)' }}
                >
                  + Add medicine
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={medicationsNone}
                    onChange={(e) => setMedicationsNone(e.target.checked)}
                  />
                  <span>No medicines</span>
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="treatmentPlan">Treatment plan (optional)</label>
                <textarea
                  id="treatmentPlan"
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  placeholder="Enter treatment plan"
                  rows={3}
                  maxLength={2000}
                />
                <span className="char-count">{treatmentPlan.length}/2000</span>
                {validationErrors.treatmentPlan && (
                  <div className="alert alert-error" style={{ marginTop: 'var(--space-2)' }}>{validationErrors.treatmentPlan}</div>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={4}
                  maxLength={1000}
                />
                <span className="char-count">{notes.length}/1000</span>
                {validationErrors.notes && (
                  <div className="alert alert-error" style={{ marginTop: 'var(--space-2)' }}>{validationErrors.notes}</div>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="payment">Payment (optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <span>₦</span>
                  <input
                    id="payment"
                    type="text"
                    inputMode="numeric"
                    value={payment}
                    onChange={(e) => {
                      // Allow digits and commas, remove everything else
                      const numericValue = e.target.value.replace(/[^\d,]/g, '');
                      setPayment(numericValue);
                    }}
                    placeholder="0"
                    maxLength={20}
                    style={{ flex: 1 }}
                  />
                </div>
                {validationErrors.payment && (
                  <div className="alert alert-error" style={{ marginTop: 'var(--space-2)' }}>{validationErrors.payment}</div>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="recordedBy">Recorded by</label>
                <input
                  id="recordedBy"
                  type="text"
                  value={recordedBy}
                  onChange={(e) => isAdmin && setRecordedBy(e.target.value)}
                  maxLength={200}
                  readOnly={!isAdmin}
                />
                {validationErrors.recordedBy && (
                  <div className="alert alert-error" style={{ marginTop: 'var(--space-2)' }}>{validationErrors.recordedBy}</div>
                )}
              </div>

              <div className="card-actions">
                <button onClick={handleSaveAndFile} className="btn btn-primary" disabled={saving}>
                  {saving ? 'Filing...' : 'Save and file'}
                </button>
                <button
                  onClick={handleStepBack}
                  className="btn btn-outline"
                  disabled={steppingBack}
                >
                  {steppingBack ? 'Going back...' : 'Go back'}
                </button>
              </div>

              <div className="card-info-box" style={{ marginTop: 'var(--space-4)' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                  When you save, the file will be placed back in {visit.currentLocation}.
                </p>
              </div>
            </div>
          </>
        )}

        {/* FILED STAGE */}
        {visit.stage === 'filed' && (
          <>
            <div className="card-header">
              <h3>✓ Complete</h3>
              <p className="card-help-text">This visit is filed and complete.</p>
            </div>

            <div className="card-body">
              <div className="filed-summary">
                <p><strong>Filed by:</strong> {visit.filedBy?.fullName || 'Unknown'}</p>
                <p><strong>Filed at:</strong> {formatDate(visit.filedAt)}</p>
                {visit.lastEditedBy && (
                  <>
                    <p style={{ marginTop: 'var(--space-2)', color: 'var(--warning-600)' }}>
                      <strong>Last edited by:</strong> {visit.lastEditedBy.fullName} on {formatDate(visit.lastEditedAt)}
                    </p>
                  </>
                )}
                <p style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  File stored in: <strong>{visit.currentLocation}</strong>
                </p>
              </div>

              <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--gray-200)' }}>
                <h4 style={{ marginBottom: 'var(--space-3)' }}>Recorded Information</h4>
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', margin: '0 0 var(--space-1) 0' }}>Tests</p>
                    <p style={{ margin: 0 }}>
                      {tests.length > 0 && tests.some(t => t.trim()) ? tests.filter(t => t.trim()).join(' • ') : 'No tests recorded'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', margin: '0 0 var(--space-1) 0' }}>Medicines</p>
                    <p style={{ margin: 0 }}>
                      {medications.length > 0 && medications.some(m => m.trim()) ? medications.filter(m => m.trim()).join(' • ') : 'No medicines recorded'}
                    </p>
                  </div>
                  {notes && (
                    <div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', margin: '0 0 var(--space-1) 0' }}>Notes</p>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-actions" style={{ marginTop: 'var(--space-4)' }}>
                {isAdmin && (
                  <Link to={`/patients/${visit.patientId}/visit/${id}?edit=1`} className="btn btn-primary">
                    Edit report
                  </Link>
                )}
                {!isAdmin && (
                  <Link to={`/patients/${visit.patientId}/visit/${id}`} className="btn btn-outline">
                    View report
                  </Link>
                )}
                <Link to="/file-desk" className="btn btn-outline">
                  Back to file desk
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VisitDetails;
