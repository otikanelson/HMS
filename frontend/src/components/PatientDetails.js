import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toPlainText } from '../lib/plainText';
import './PatientDetails.css';

const DOCTOR_NAME = 'Dr Otika Charles';

const PatientDetails = () => {
  const { patientId, visitId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const printRef = useRef();
  
  const [patient, setPatient] = useState(null);
  const [visit, setVisit] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  
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
    clearNotice();
    
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

    // Recorded by: max 200
    if (editValues.recordedBy?.trim().length > 200) {
      setEditErrors(prev => ({ ...prev, recordedBy: 'Recorded by cannot exceed 200 characters.' }));
      return;
    }

    // Build payload with only changed fields
    const payload = {};
    
    // Text fields: compare with (visit.field || '')
    if ((visit.chiefComplaint || '') !== (editValues.chiefComplaint || '').trim()) {
      payload.chiefComplaint = (editValues.chiefComplaint || '').trim();
    }
    if ((visit.diagnosis || '') !== (editValues.diagnosis || '').trim()) {
      payload.diagnosis = (editValues.diagnosis || '').trim();
    }
    if ((visit.treatmentPlan || '') !== (editValues.treatmentPlan || '').trim()) {
      payload.treatmentPlan = (editValues.treatmentPlan || '').trim();
    }
    if ((visit.payment || '') !== (editValues.payment || '').trim()) {
      payload.payment = (editValues.payment || '').trim();
    }
    if ((visit.recordedBy || '') !== (editValues.recordedBy || '').trim()) {
      payload.recordedBy = (editValues.recordedBy || '').trim();
    }
    if ((visit.notes || '') !== (editValues.notes || '').trim()) {
      payload.notes = (editValues.notes || '').trim();
    }

    // Tests and Medicines: clean and compare
    const cleanTests = (editValues.tests || []).map(t => t.trim()).filter(t => t.length > 0);
    if (JSON.stringify(visit.tests || []) !== JSON.stringify(cleanTests)) {
      payload.tests = cleanTests;
    }
    if (JSON.stringify(visit.testsNone || false) !== JSON.stringify(editValues.testsNone || false)) {
      payload.testsNone = editValues.testsNone || false;
    }

    const cleanMeds = (editValues.medications || []).map(m => m.trim()).filter(m => m.length > 0);
    if (JSON.stringify(visit.medications || []) !== JSON.stringify(cleanMeds)) {
      payload.medications = cleanMeds;
    }
    if (JSON.stringify(visit.medicationsNone || false) !== JSON.stringify(editValues.medicationsNone || false)) {
      payload.medicationsNone = editValues.medicationsNone || false;
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
      setNotice('Saved.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save changes';
      setEditErrors(prev => ({ ...prev, general: msg }));
    } finally {
      setSaving(false);
    }
  };

  const clearNotice = () => {
    setNotice('');
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
      <div className="report-screen-controls no-print">
        <div className="controls-left">
          {visits.indexOf(visit) > 0 ? (
            <Link to={`/patients/${patientId}/visit/${visits[visits.indexOf(visit) - 1]._id}`} className="btn btn-secondary">
              ← Newer visit
            </Link>
          ) : (
            <button className="btn btn-secondary" disabled>
              ← Newer visit
            </button>
          )}
        </div>
        <div className="controls-right">
          {!editMode && (
            <button onClick={handlePrint} className="btn btn-primary">
              Print
            </button>
          )}
          {isFiled && isAdmin && !editMode && (
            <button onClick={handleEditClick} className="btn btn-secondary">
              Edit this visit
            </button>
          )}
          {editMode && (
            <>
              <button onClick={handleCancelEdit} className="btn btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button onClick={handleSaveChanges} className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </>
          )}
          {visits.indexOf(visit) < visits.length - 1 ? (
            <Link to={`/patients/${patientId}/visit/${visits[visits.indexOf(visit) + 1]._id}`} className="btn btn-secondary">
              Older visit →
            </Link>
          ) : (
            <button className="btn btn-secondary" disabled>
              Older visit →
            </button>
          )}
        </div>
      </div>

      {editMode && (
        <div className="edit-mode-banner">
          <strong>You are editing a finished record</strong>
          <span className="banner-info">Changes will be logged in the activity log</span>
        </div>
      )}

      {editErrors.general && (
        <div className="alert alert-error">
          {editErrors.general}
        </div>
      )}

      {notice && (
        <div className="alert alert-success">
          {notice}
        </div>
      )}

      {error && !notice && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div ref={printRef} className={`report-document ${editMode ? 'is-editing' : ''}`}>
        <header className="report-header">
          <img src="/Icon.png" alt="Tender Care" className="report-logo" />
          <div className="report-header-text">
            <div className="clinic-name">Tender Care Clinic</div>
          </div>
        </header>
        <h1 className="report-title">Medical Examination Report</h1>

        <section className="report-section">
          <h2 className="section-heading">Patient details</h2>
          <dl className="detail-grid">
            <div className="detail-row"><dt>Patient name</dt><dd>{patient?.fullName || '—'}</dd></div>
            <div className="detail-row"><dt>File number</dt><dd>{patient?.patientId || '—'}</dd></div>
            <div className="detail-row"><dt>Phone</dt><dd>{patient?.phoneNumber || '—'}</dd></div>
            <div className="detail-row"><dt>Visit date</dt><dd>{visit?.startedAt ? new Date(visit.startedAt).toLocaleDateString('en-NG') : '—'}</dd></div>
          </dl>
        </section>

        {/* CHECK-IN SECTION */}
        <section className="report-section">
          <h2 className="section-heading">Check-in</h2>
          {editMode ? (
            <div>
              <div className="check-row">
                <input type="checkbox" checked={editValues.vitalsNotTaken} onChange={(e) => {
                  setEditValues(prev => ({...prev, vitalsNotTaken: e.target.checked, vitals: e.target.checked ? undefined : prev.vitals}));
                }} />
                <label>Not taken</label>
              </div>
              {editValues.vitalsNotTaken ? (
                <div className="edit-field">
                  <label className="edit-field-label">Reason</label>
                  <input type="text" value={editValues.vitalsNotTakenReason} onChange={(e) => setEditValues(prev => ({...prev, vitalsNotTakenReason: e.target.value}))} maxLength={200} />
                </div>
              ) : (
                <div className="vitals-edit">
                  <div className="edit-field">
                    <label className="edit-field-label">Top (mmHg)</label>
                    <input type="number" value={editValues.vitals?.systolic || ''} onChange={(e) => setEditValues(prev => ({...prev, vitals: {...prev.vitals, systolic: parseInt(e.target.value)}}))} />
                  </div>
                  <div className="edit-field">
                    <label className="edit-field-label">Bottom (mmHg)</label>
                    <input type="number" value={editValues.vitals?.diastolic || ''} onChange={(e) => setEditValues(prev => ({...prev, vitals: {...prev.vitals, diastolic: parseInt(e.target.value)}}))} />
                  </div>
                  <div className="edit-field">
                    <label className="edit-field-label">Heart rate (bpm)</label>
                    <input type="number" value={editValues.vitals?.heartRate || ''} onChange={(e) => setEditValues(prev => ({...prev, vitals: {...prev.vitals, heartRate: parseInt(e.target.value)}}))} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <dl className="detail-grid">
              {visit.vitalsNotTaken ? (
                <div className="detail-row is-wide"><dt>Vitals</dt><dd>Not taken. Reason: {visit.vitalsNotTakenReason || 'none given'}</dd></div>
              ) : visit.vitals ? (
                <>
                  <div className="detail-row"><dt>Blood pressure</dt><dd>{visit.vitals.systolic}/{visit.vitals.diastolic} mmHg</dd></div>
                  <div className="detail-row"><dt>Heart rate</dt><dd>{visit.vitals.heartRate} bpm</dd></div>
                </>
              ) : (
                <div className="detail-row is-wide"><dt>Vitals</dt><dd><span className="not-recorded">Not recorded</span></dd></div>
              )}
            </dl>
          )}
        </section>

        {/* CHIEF COMPLAINT */}
        <section className="report-section">
          <h2 className="section-heading">Chief complaint</h2>
          {editMode ? (
            <div className="edit-field">
              <textarea value={editValues.chiefComplaint} onChange={(e) => setEditValues(prev => ({...prev, chiefComplaint: e.target.value}))} maxLength={2000} />
              {editErrors.chiefComplaint && <p className="edit-error">{editErrors.chiefComplaint}</p>}
            </div>
          ) : (
            <p className="section-value">{toPlainText(visit.chiefComplaint) || <span className="not-recorded">Not recorded</span>}</p>
          )}
        </section>

        {/* DIAGNOSIS */}
        <section className="report-section">
          <h2 className="section-heading">Diagnosis</h2>
          {editMode ? (
            <div className="edit-field">
              <textarea value={editValues.diagnosis} onChange={(e) => setEditValues(prev => ({...prev, diagnosis: e.target.value}))} maxLength={2000} />
              {editErrors.diagnosis && <p className="edit-error">{editErrors.diagnosis}</p>}
            </div>
          ) : (
            <p className="section-value">{toPlainText(visit.diagnosis) || <span className="not-recorded">Not recorded</span>}</p>
          )}
        </section>

        {/* TESTS AND MEDICINES SIDE BY SIDE */}
        <div className="report-section-row">
          <section className="report-section">
            <h2 className="section-heading">Tests</h2>
            {editMode ? (
              <div>
                {editValues.tests.map((test, i) => (
                  <div key={i} className="edit-row">
                    <input type="text" value={test} onChange={(e) => {const newTests = [...editValues.tests]; newTests[i] = e.target.value; setEditValues(prev => ({...prev, tests: newTests}));}} maxLength={200} />
                    {editValues.tests.length > 1 && <button type="button" onClick={() => setEditValues(prev => ({...prev, tests: prev.tests.filter((_, idx) => idx !== i)}))} className="btn btn-link">Remove</button>}
                  </div>
                ))}
                <button type="button" onClick={() => setEditValues(prev => ({...prev, tests: [...prev.tests, '']}))} className="btn btn-link">Add a test</button>
                <div className="check-row">
                  <input type="checkbox" checked={editValues.testsNone} onChange={(e) => setEditValues(prev => ({...prev, testsNone: e.target.checked}))} />
                  <label>No tests</label>
                </div>
              </div>
            ) : (
              editValues.testsNone ? (
                <p className="section-value">None</p>
              ) : editValues.tests?.length > 0 && editValues.tests.some(t => t.trim()) ? (
                <ul className="report-list">{editValues.tests.filter(t => t.trim()).map((t, i) => <li key={i}>{t}</li>)}</ul>
              ) : (
                <p className="section-value"><span className="not-recorded">Not recorded</span></p>
              )
            )}
          </section>

          <section className="report-section">
            <h2 className="section-heading">Medicines</h2>
            {editMode ? (
              <div>
                {editValues.medications.map((med, i) => (
                  <div key={i} className="edit-row">
                    <input type="text" value={med} onChange={(e) => {const newMeds = [...editValues.medications]; newMeds[i] = e.target.value; setEditValues(prev => ({...prev, medications: newMeds}));}} maxLength={200} />
                    {editValues.medications.length > 1 && <button type="button" onClick={() => setEditValues(prev => ({...prev, medications: prev.medications.filter((_, idx) => idx !== i)}))} className="btn btn-link">Remove</button>}
                  </div>
                ))}
                <button type="button" onClick={() => setEditValues(prev => ({...prev, medications: [...prev.medications, '']}))} className="btn btn-link">Add a medicine</button>
                <div className="check-row">
                  <input type="checkbox" checked={editValues.medicationsNone} onChange={(e) => setEditValues(prev => ({...prev, medicationsNone: e.target.checked}))} />
                  <label>No medicines</label>
                </div>
              </div>
            ) : (
              editValues.medicationsNone ? (
                <p className="section-value">None</p>
              ) : editValues.medications?.length > 0 && editValues.medications.some(m => m.trim()) ? (
                <ul className="report-list">{editValues.medications.filter(m => m.trim()).map((m, i) => <li key={i}>{m}</li>)}</ul>
              ) : (
                <p className="section-value"><span className="not-recorded">Not recorded</span></p>
              )
            )}
          </section>
        </div>

        {/* TREATMENT PLAN */}
        <section className="report-section">
          <h2 className="section-heading">Treatment plan</h2>
          {editMode ? (
            <div className="edit-field">
              <textarea value={editValues.treatmentPlan} onChange={(e) => setEditValues(prev => ({...prev, treatmentPlan: e.target.value}))} maxLength={2000} />
              {editErrors.treatmentPlan && <p className="edit-error">{editErrors.treatmentPlan}</p>}
            </div>
          ) : (
            <p className="section-value">{toPlainText(visit.treatmentPlan) || <span className="not-recorded">Not recorded</span>}</p>
          )}
        </section>

        {/* NOTES */}
        <section className="report-section">
          <h2 className="section-heading">Notes</h2>
          {editMode ? (
            <div className="edit-field">
              <textarea value={editValues.notes} onChange={(e) => setEditValues(prev => ({...prev, notes: e.target.value}))} maxLength={1000} />
            </div>
          ) : (
            <p className="section-value">{toPlainText(visit.notes) || <span className="not-recorded">Not recorded</span>}</p>
          )}
        </section>

        {/* FOOTER */}
        <footer className="report-footer">
          <div className="footer-item">
            <span className="footer-label">Recorded by</span>
            <span className="footer-value">
              {editMode ? (
                <input type="text" value={editValues.recordedBy} onChange={(e) => setEditValues(prev => ({...prev, recordedBy: e.target.value}))} maxLength={200} />
              ) : (
                visit.recordedBy || '—'
              )}
            </span>
          </div>
          <div className="footer-item footer-signature">
            <span className="footer-label">Doctor consulted</span>
            <span className="footer-value">{DOCTOR_NAME}</span>
          </div>
          {(visit.payment || editMode) && (
            <div className="footer-item">
              <span className="footer-label">Payment</span>
              <span className="footer-value">
                {editMode ? (
                  <input type="text" value={editValues.payment} onChange={(e) => setEditValues(prev => ({...prev, payment: e.target.value}))} maxLength={20} />
                ) : (
                  formatPayment(visit.payment) || '—'
                )}
              </span>
              {editErrors.payment && <p className="edit-error">{editErrors.payment}</p>}
            </div>
          )}
          <div className="footer-item">
            <span className="footer-label">Date</span>
            <span className="footer-value">
              {visit.filedAt ? new Date(visit.filedAt).toLocaleDateString('en-NG') : visit.startedAt ? new Date(visit.startedAt).toLocaleDateString('en-NG') : '—'}
            </span>
          </div>
        </footer>

        <p className="report-printed">Printed on {new Date().toLocaleDateString('en-NG')}</p>
      </div>
    </div>
  );
};

export default PatientDetails;
