import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toPlainText } from '../lib/plainText';
import './PatientDetails.css';

const STAGE_LABELS = {
  waiting_for_file: 'Finding file',
  with_doctor: 'With doctor',
  needs_recording: 'File back, needs recording',
  filed: 'Filed'
};

const PatientDetails = () => {
  const { patientId, visitId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const printRef = useRef();
  
  const [patient, setPatient] = useState(null);
  const [visit, setVisit] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.accessLevel === 'ADMINISTRATOR';
  const isFiled = visit?.stage === 'filed';
  const editParam = searchParams.get('edit');
  
  useEffect(() => {
    // Check if edit param is set and we're an admin on a filed visit
    if (editParam === '1' && isAdmin && isFiled) {
      setEditMode(true);
    } else {
      setEditMode(false);
    }
  }, [editParam, isAdmin, isFiled]);

  // Fetch visits list once when patientId changes
  useEffect(() => {
    fetchVisits();
    // eslint-disable-next-line
  }, [patientId]);

  // Pick visit from list when visitId changes
  useEffect(() => {
    if (visits.length > 0 && visitId) {
      const foundVisit = visits.find(v => v._id === visitId);
      if (foundVisit) {
        setVisit(foundVisit);
        setEditValues({
          vitals: foundVisit.vitals ? { ...foundVisit.vitals } : undefined,
          vitalsNotTaken: foundVisit.vitalsNotTaken,
          vitalsNotTakenReason: foundVisit.vitalsNotTakenReason || '',
          chiefComplaint: foundVisit.chiefComplaint || '',
          diagnosis: foundVisit.diagnosis || '',
          treatmentPlan: foundVisit.treatmentPlan || '',
          tests: foundVisit.tests || [],
          testsNone: foundVisit.testsNone || false,
          medications: foundVisit.medications || [],
          medicationsNone: foundVisit.medicationsNone || false,
          notes: foundVisit.notes || '',
          payment: foundVisit.payment || '',
          recordedBy: foundVisit.recordedBy || ''
        });
      }
    }
    // eslint-disable-next-line
  }, [visitId, visits]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`/api/visits/patient/${patientId}`);
      setPatient(response.data.patient);
      setVisits(response.data.visits || []);
    } catch (err) {
      console.error('Failed to fetch visits:', err);
      setError(err.response?.data?.message || 'Failed to load visit history');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setSearchParams({ edit: '1' });
  };

  const handleCancelEdit = () => {
    if (Object.keys(editValues).some(key => {
      const orig = visit[key];
      const edited = editValues[key];
      return JSON.stringify(orig) !== JSON.stringify(edited);
    })) {
      if (!window.confirm('Discard your changes?')) return;
    }
    setSearchParams({});
    setEditMode(false);
  };

  const handleSaveChanges = async () => {
    // Validate changes
    setEditErrors({});
    
    // Chief complaint: required if filing, 1-2000
    if (!editValues.chiefComplaint?.trim()) {
      setEditErrors(prev => ({ ...prev, chiefComplaint: 'Please write the patient\'s complaint.' }));
      return;
    }
    if (editValues.chiefComplaint.trim().length > 2000) {
      setEditErrors(prev => ({ ...prev, chiefComplaint: 'Chief complaint cannot exceed 2000 characters.' }));
      return;
    }

    // Diagnosis: required, 1-2000
    if (!editValues.diagnosis?.trim()) {
      setEditErrors(prev => ({ ...prev, diagnosis: 'Please write the diagnosis.' }));
      return;
    }
    if (editValues.diagnosis.trim().length > 2000) {
      setEditErrors(prev => ({ ...prev, diagnosis: 'Diagnosis cannot exceed 2000 characters.' }));
      return;
    }

    // Treatment plan: optional, max 2000
    if (editValues.treatmentPlan?.trim().length > 2000) {
      setEditErrors(prev => ({ ...prev, treatmentPlan: 'Treatment plan cannot exceed 2000 characters.' }));
      return;
    }

    // Payment: optional, must be number if given
    if (editValues.payment?.trim() && !/^(\d+(\.\d{1,2})?)$/.test(editValues.payment.trim())) {
      setEditErrors(prev => ({ ...prev, payment: 'Payment must be a number, e.g. 5000.' }));
      return;
    }

    // Recorded by: required, 1-200
    if (!editValues.recordedBy?.trim()) {
      setEditErrors(prev => ({ ...prev, recordedBy: 'Please say who recorded this visit.' }));
      return;
    }
    if (editValues.recordedBy.trim().length > 200) {
      setEditErrors(prev => ({ ...prev, recordedBy: 'Recorded by cannot exceed 200 characters.' }));
      return;
    }

    // Build payload with only changed fields
    const payload = {};
    if (visit.chiefComplaint !== editValues.chiefComplaint?.trim()) {
      payload.chiefComplaint = editValues.chiefComplaint?.trim();
    }
    if (visit.diagnosis !== editValues.diagnosis?.trim()) {
      payload.diagnosis = editValues.diagnosis?.trim();
    }
    if (visit.treatmentPlan !== editValues.treatmentPlan?.trim()) {
      payload.treatmentPlan = editValues.treatmentPlan?.trim();
    }
    if (visit.payment !== editValues.payment?.trim()) {
      payload.payment = editValues.payment?.trim();
    }
    if (visit.recordedBy !== editValues.recordedBy?.trim()) {
      payload.recordedBy = editValues.recordedBy?.trim();
    }
    // Vitals
    if (editValues.vitalsNotTaken && !visit.vitalsNotTaken) {
      payload.notTaken = true;
      payload.reason = editValues.vitalsNotTakenReason?.trim();
    } else if (!editValues.vitalsNotTaken && visit.vitalsNotTaken) {
      payload.vitals = editValues.vitals;
      payload.notTaken = false;
    } else if (!editValues.vitalsNotTaken && editValues.vitals && 
               (editValues.vitals.systolic !== visit.vitals?.systolic ||
                editValues.vitals.diastolic !== visit.vitals?.diastolic ||
                editValues.vitals.heartRate !== visit.vitals?.heartRate)) {
      payload.vitals = editValues.vitals;
    }

    if (Object.keys(payload).length === 0) {
      setError('Nothing was changed.');
      return;
    }

    if (!window.confirm('This changes a finished medical record. The old and new values will be saved in the activity log. Save changes?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await axios.put(`/api/visits/${visit._id}/correct`, payload);
      await fetchVisits();
      setSearchParams({});
      setEditMode(false);
      setTimeout(() => {
        setError('Saved.');
      }, 300);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save changes';
      setEditErrors(prev => ({ ...prev, general: msg }));
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="patient-details">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !visit) {
    return (
      <div className="patient-details">
        <div style={{ padding: '2rem' }}>
          <p className="alert alert-error">{error}</p>
          <Link to="/patients" className="btn btn-outline">Back to Patients</Link>
        </div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="patient-details">
        <div style={{ padding: '2rem' }}>
          <p>No visit selected.</p>
          <Link to="/patients" className="btn btn-outline">Back to Patients</Link>
        </div>
      </div>
    );
  }

  const vitalText = editMode && editValues.vitalsNotTaken
    ? `Not taken: ${editValues.vitalsNotTakenReason || 'No reason given'}`
    : editMode && editValues.vitals
    ? `BP ${editValues.vitals.systolic}/${editValues.vitals.diastolic}, HR ${editValues.vitals.heartRate}`
    : visit.vitalsNotTaken
    ? `Not taken: ${visit.vitalsNotTakenReason || 'No reason given'}`
    : visit.vitals
    ? `BP ${visit.vitals.systolic}/${visit.vitals.diastolic}, HR ${visit.vitals.heartRate}`
    : 'Not recorded';

  const formatPayment = (value) => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div className="patient-details">
      <div className="report-screen-controls">
        <div className="controls-left">
          <Link to={`/patients/${patientId}/visit/${visits[visits.indexOf(visit) - 1]?._id || ''}`} 
                className="btn btn-outline" 
                disabled={visits.indexOf(visit) === 0}>
            ← Newer visit
          </Link>
        </div>
        <div className="controls-right">
          {isFiled && isAdmin && !editMode && (
            <button onClick={handleEditClick} className="btn btn-primary">
              Edit this visit
            </button>
          )}
          {editMode && (
            <>
              <button onClick={handleCancelEdit} className="btn btn-outline" disabled={saving}>
                Cancel
              </button>
              <button onClick={handleSaveChanges} className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </>
          )}
          {!editMode && (
            <button onClick={handlePrint} className="btn btn-outline">
              Print
            </button>
          )}
          <Link to={`/patients/${patientId}/visit/${visits[visits.indexOf(visit) + 1]?._id || ''}`} 
                className="btn btn-outline"
                disabled={visits.indexOf(visit) === visits.length - 1}>
            Older visit →
          </Link>
        </div>
      </div>

      {editMode && (
        <div className="edit-mode-banner">
          <strong>You are editing a finished record</strong>
          <span className="banner-info">Changes will be logged in the activity log</span>
        </div>
      )}

      {editErrors.general && (
        <div className="alert alert-error" style={{ margin: '1rem' }}>
          {editErrors.general}
        </div>
      )}

      {error && (
        <div className="alert alert-success" style={{ margin: '1rem' }}>
          {error}
        </div>
      )}

      <div ref={printRef} className="report-document">
        {/* Clinic header */}
        <div className="report-header">
          <div className="clinic-name">Tender Care Clinic</div>
          <div className="document-title">Medical Examination Report</div>
        </div>

        {/* Patient info */}
        <div className="report-section">
          <div className="patient-info-grid">
            <div>
              <p className="section-label">Patient Name</p>
              <p className="section-value">{patient?.fullName || '-'}</p>
            </div>
            <div>
              <p className="section-label">Patient Number</p>
              <p className="section-value">{patient?.patientId || '-'}</p>
            </div>
            <div>
              <p className="section-label">Phone</p>
              <p className="section-value">{patient?.phoneNumber || '-'}</p>
            </div>
            <div>
              <p className="section-label">Visit Date</p>
              <p className="section-value">
                {visit?.startedAt ? new Date(visit.startedAt).toLocaleDateString('en-NG') : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Check-in / Vitals */}
        <div className="report-section">
          <p className="section-label">Check-in</p>
          {editMode ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <label>
                <input 
                  type="checkbox" 
                  checked={editValues.vitalsNotTaken} 
                  onChange={(e) => {
                    setEditValues(prev => ({ 
                      ...prev, 
                      vitalsNotTaken: e.target.checked,
                      vitals: e.target.checked ? undefined : prev.vitals
                    }));
                  }}
                />
                <span style={{ marginLeft: '0.5rem' }}>Not taken</span>
              </label>
              {editValues.vitalsNotTaken ? (
                <input 
                  type="text" 
                  value={editValues.vitalsNotTakenReason} 
                  onChange={(e) => setEditValues(prev => ({ ...prev, vitalsNotTakenReason: e.target.value }))}
                  placeholder="Reason"
                  maxLength={200}
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <label>Top (mmHg)</label>
                    <input 
                      type="number" 
                      value={editValues.vitals?.systolic || ''} 
                      onChange={(e) => setEditValues(prev => ({ 
                        ...prev, 
                        vitals: { ...prev.vitals, systolic: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                  <div>
                    <label>Bottom (mmHg)</label>
                    <input 
                      type="number" 
                      value={editValues.vitals?.diastolic || ''} 
                      onChange={(e) => setEditValues(prev => ({ 
                        ...prev, 
                        vitals: { ...prev.vitals, diastolic: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                  <div>
                    <label>Heart rate (bpm)</label>
                    <input 
                      type="number" 
                      value={editValues.vitals?.heartRate || ''} 
                      onChange={(e) => setEditValues(prev => ({ 
                        ...prev, 
                        vitals: { ...prev.vitals, heartRate: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="section-value">{vitalText}</p>
          )}
        </div>

        {/* Chief complaint */}
        <div className="report-section">
          <p className="section-label">Chief Complaint</p>
          {editMode ? (
            <div>
              <textarea 
                value={editValues.chiefComplaint} 
                onChange={(e) => setEditValues(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                rows={3}
                maxLength={2000}
              />
              {editErrors.chiefComplaint && <p style={{ color: 'var(--error-600)', fontSize: '0.875rem' }}>{editErrors.chiefComplaint}</p>}
            </div>
          ) : (
            <p className="section-value" style={{ whiteSpace: 'pre-wrap' }}>
              {editValues.chiefComplaint || toPlainText(visit.chiefComplaint) || <span className="not-recorded">Not recorded</span>}
            </p>
          )}
        </div>

        {/* Tests */}
        <div className="report-section">
          <p className="section-label">Tests</p>
          {editMode ? (
            <div>
              {editValues.tests.map((test, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={test} 
                    onChange={(e) => {
                      const newTests = [...editValues.tests];
                      newTests[i] = e.target.value;
                      setEditValues(prev => ({ ...prev, tests: newTests }));
                    }}
                    style={{ flex: 1 }}
                    maxLength={200}
                  />
                  {editValues.tests.length > 1 && (
                    <button onClick={() => setEditValues(prev => ({ 
                      ...prev, 
                      tests: prev.tests.filter((_, idx) => idx !== i)
                    }))}>×</button>
                  )}
                </div>
              ))}
              <button onClick={() => setEditValues(prev => ({ ...prev, tests: [...prev.tests, ''] }))}>
                + Add test
              </button>
              <label>
                <input 
                  type="checkbox" 
                  checked={editValues.testsNone} 
                  onChange={(e) => setEditValues(prev => ({ ...prev, testsNone: e.target.checked }))}
                />
                <span> No tests</span>
              </label>
            </div>
          ) : (
            <p className="section-value">
              {editValues.tests?.length > 0 && editValues.tests.some(t => t.trim())
                ? editValues.tests.filter(t => t.trim()).join('\n')
                : <span className="not-recorded">Not recorded</span>}
            </p>
          )}
        </div>

        {/* Diagnosis */}
        <div className="report-section">
          <p className="section-label">Diagnosis</p>
          {editMode ? (
            <div>
              <textarea 
                value={editValues.diagnosis} 
                onChange={(e) => setEditValues(prev => ({ ...prev, diagnosis: e.target.value }))}
                rows={3}
                maxLength={2000}
              />
              {editErrors.diagnosis && <p style={{ color: 'var(--error-600)', fontSize: '0.875rem' }}>{editErrors.diagnosis}</p>}
            </div>
          ) : (
            <p className="section-value" style={{ whiteSpace: 'pre-wrap' }}>
              {editValues.diagnosis || toPlainText(visit.diagnosis) || <span className="not-recorded">Not recorded</span>}
            </p>
          )}
        </div>

        {/* Medicines */}
        <div className="report-section">
          <p className="section-label">Medicines</p>
          {editMode ? (
            <div>
              {editValues.medications.map((med, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={med} 
                    onChange={(e) => {
                      const newMeds = [...editValues.medications];
                      newMeds[i] = e.target.value;
                      setEditValues(prev => ({ ...prev, medications: newMeds }));
                    }}
                    style={{ flex: 1 }}
                    maxLength={200}
                  />
                  {editValues.medications.length > 1 && (
                    <button onClick={() => setEditValues(prev => ({ 
                      ...prev, 
                      medications: prev.medications.filter((_, idx) => idx !== i)
                    }))}>×</button>
                  )}
                </div>
              ))}
              <button onClick={() => setEditValues(prev => ({ ...prev, medications: [...prev.medications, ''] }))}>
                + Add medicine
              </button>
              <label>
                <input 
                  type="checkbox" 
                  checked={editValues.medicationsNone} 
                  onChange={(e) => setEditValues(prev => ({ ...prev, medicationsNone: e.target.checked }))}
                />
                <span> No medicines</span>
              </label>
            </div>
          ) : (
            <p className="section-value">
              {editValues.medications?.length > 0 && editValues.medications.some(m => m.trim())
                ? editValues.medications.filter(m => m.trim()).join('\n')
                : <span className="not-recorded">Not recorded</span>}
            </p>
          )}
        </div>

        {/* Treatment plan */}
        <div className="report-section">
          <p className="section-label">Treatment Plan</p>
          {editMode ? (
            <div>
              <textarea 
                value={editValues.treatmentPlan} 
                onChange={(e) => setEditValues(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                rows={3}
                maxLength={2000}
              />
              {editErrors.treatmentPlan && <p style={{ color: 'var(--error-600)', fontSize: '0.875rem' }}>{editErrors.treatmentPlan}</p>}
            </div>
          ) : (
            <p className="section-value" style={{ whiteSpace: 'pre-wrap' }}>
              {editValues.treatmentPlan || toPlainText(visit.treatmentPlan) || <span className="not-recorded">Not recorded</span>}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="report-section">
          <p className="section-label">Notes</p>
          {editMode ? (
            <textarea 
              value={editValues.notes} 
              onChange={(e) => setEditValues(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              maxLength={1000}
            />
          ) : (
            <p className="section-value" style={{ whiteSpace: 'pre-wrap' }}>
              {editValues.notes || toPlainText(visit.notes) || <span className="not-recorded">Not recorded</span>}
            </p>
          )}
        </div>

        {/* Payment */}
        <div className="report-section">
          <p className="section-label">Payment</p>
          {editMode ? (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span>₦</span>
                <input 
                  type="text" 
                  value={editValues.payment} 
                  onChange={(e) => setEditValues(prev => ({ ...prev, payment: e.target.value }))}
                  placeholder="0"
                  maxLength={20}
                />
              </div>
              {editErrors.payment && <p style={{ color: 'var(--error-600)', fontSize: '0.875rem' }}>{editErrors.payment}</p>}
            </div>
          ) : (
            <p className="section-value">
              {editValues.payment ? formatPayment(editValues.payment) : <span className="not-recorded">—</span>}
            </p>
          )}
        </div>

        {/* Recorded by / Signature */}
        <div className="report-section">
          <p className="section-label">Recorded By</p>
          {editMode ? (
            <div>
              <input 
                type="text" 
                value={editValues.recordedBy} 
                onChange={(e) => setEditValues(prev => ({ ...prev, recordedBy: e.target.value }))}
                maxLength={200}
              />
              {editErrors.recordedBy && <p style={{ color: 'var(--error-600)', fontSize: '0.875rem' }}>{editErrors.recordedBy}</p>}
            </div>
          ) : (
            <p className="section-value">
              {editValues.recordedBy || <span className="not-recorded">—</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetails;
