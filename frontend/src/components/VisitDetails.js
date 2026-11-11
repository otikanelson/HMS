import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './VisitDetails.css';

const VisitDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    systolic: '',
    diastolic: '',
    heartRate: '',
    tests: [],
    medications: [],
    notes: ''
  });
  const [validationErrors, setValidationErrors] = useState({});

  const isAdmin = user?.accessLevel === 'ADMINISTRATOR';
  const canHandleFiles = user?.accessLevel === 'ADMINISTRATOR' || user?.accessLevel === 'RECORDS_OPERATOR';

  useEffect(() => {
    fetchVisit();
  }, [id]);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`/api/visits/${id}`);
      const visitData = response.data.visit;
      setVisit(visitData);

      // Initialize form if pending
      if (visitData.documentationStatus === 'pending') {
        setIsEditing(true);
        initializeForm(visitData);
      } else {
        initializeForm(visitData);
      }
    } catch (err) {
      console.error('Failed to fetch visit:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = (visitData) => {
    setFormData({
      systolic: visitData.vitals?.systolic || '',
      diastolic: visitData.vitals?.diastolic || '',
      heartRate: visitData.vitals?.heartRate || '',
      tests: visitData.tests?.length > 0 ? visitData.tests : [{ name: '', result: '' }],
      medications: visitData.medications?.length > 0 ? visitData.medications : [{ name: '', dose: '', frequency: '', duration: '' }],
      notes: visitData.notes || ''
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleTestChange = (index, field, value) => {
    const newTests = [...formData.tests];
    newTests[index] = { ...newTests[index], [field]: value };
    setFormData(prev => ({ ...prev, tests: newTests }));
  };

  const addTest = () => {
    setFormData(prev => ({
      ...prev,
      tests: [...prev.tests, { name: '', result: '' }]
    }));
  };

  const removeTest = (index) => {
    setFormData(prev => ({
      ...prev,
      tests: prev.tests.filter((_, i) => i !== index)
    }));
  };

  const handleMedicationChange = (index, field, value) => {
    const newMeds = [...formData.medications];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setFormData(prev => ({ ...prev, medications: newMeds }));
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dose: '', frequency: '', duration: '' }]
    }));
  };

  const removeMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const errors = {};

    // Validate BP values
    const sys = Number(formData.systolic);
    const dia = Number(formData.diastolic);
    
    const hasSys = formData.systolic !== '';
    const hasDia = formData.diastolic !== '';

    if (hasSys !== hasDia) {
      errors.bloodPressure = 'Please enter both top and bottom blood pressure numbers';
    } else if (hasSys && hasDia) {
      if (!Number.isInteger(sys) || sys < 50 || sys > 260) {
        errors.systolic = 'Top number must be between 50 and 260';
      }
      if (!Number.isInteger(dia) || dia < 30 || dia > 160) {
        errors.diastolic = 'Bottom number must be between 30 and 160';
      }
      if (sys <= dia) {
        errors.bloodPressure = 'Top number must be greater than bottom number';
      }
    }

    // Validate heart rate
    if (formData.heartRate !== '') {
      const hr = Number(formData.heartRate);
      if (!Number.isInteger(hr) || hr < 20 || hr > 250) {
        errors.heartRate = 'Heart rate must be between 20 and 250';
      }
    }

    // Check if at least one field is filled
    const hasAnyData = hasSys || hasDia || formData.heartRate !== '' ||
      formData.tests.some(t => t.name.trim()) ||
      formData.medications.some(m => m.name.trim()) ||
      formData.notes.trim();

    if (!hasAnyData) {
      errors.general = 'Please enter at least one piece of information';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    // Ask for confirmation if editing a documented visit
    if (visit.documentationStatus === 'done') {
      if (!window.confirm('This will change a finished record. The change will be logged. Continue?')) {
        return;
      }
    }

    try {
      setSaving(true);
      setError('');
      setValidationErrors({});

      const payload = {
        vitals: {
          systolic: formData.systolic !== '' ? Number(formData.systolic) : undefined,
          diastolic: formData.diastolic !== '' ? Number(formData.diastolic) : undefined,
          heartRate: formData.heartRate !== '' ? Number(formData.heartRate) : undefined
        },
        tests: formData.tests.filter(t => t.name.trim()),
        medications: formData.medications.filter(m => m.name.trim()),
        notes: formData.notes.trim()
      };

      await axios.put(`/api/visits/${id}/details`, payload);
      setSaveSuccess('Saved. This file can go back in the cabinet.');
      await fetchVisit();
      setIsEditing(false);

      setTimeout(() => {
        setSaveSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Save error:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to save details';
      if (err.response?.status === 403 || err.response?.status === 409) {
        setError(errorMsg);
      } else {
        setValidationErrors({ general: errorMsg });
      }
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

  const isDocumented = visit.documentationStatus === 'done';
  const canEdit = isDocumented ? isAdmin : true;

  return (
    <div className="visit-details">
      <div className="visit-header">
        <div>
          <h2 className="visit-title">Visit Details</h2>
          <div className="visit-meta">
            <p><strong>{visit.patientName}</strong> • Patient {visit.patientId}</p>
            <p className="visit-date">{formatDate(visit.checkedOutAt)}</p>
            <p className="visit-location">{visit.fileLocation}</p>
          </div>
        </div>
        {canHandleFiles && (
          <Link to="/file-desk" className="btn btn-outline">
            Back to File Desk
          </Link>
        )}
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {saveSuccess && (
        <div className="alert alert-success">
          {saveSuccess}
          <div style={{ marginTop: 'var(--space-2)' }}>
            {canHandleFiles ? (
              <Link to="/file-desk" className="link">Return to File Desk</Link>
            ) : (
              <Link to={`/patients/${visit.patientId}/history`} className="link">View patient history</Link>
            )}
          </div>
        </div>
      )}

      {validationErrors.general && (
        <div className="alert alert-error">{validationErrors.general}</div>
      )}

      <div className="visit-form">
        {isDocumented && !isEditing && (
          <div className="documented-notice">
            <p>This visit was documented on {formatDate(visit.documentedAt)} by {visit.documentedBy?.fullName}</p>
            {isAdmin && (
              <button onClick={() => setIsEditing(true)} className="btn btn-outline">
                Edit / Correct
              </button>
            )}
          </div>
        )}

        <div className="form-section">
          <h3>Blood Pressure</h3>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="systolic">Top number (mmHg)</label>
              <input
                id="systolic"
                type="number"
                value={formData.systolic}
                onChange={(e) => handleInputChange('systolic', e.target.value)}
                disabled={!isEditing}
                placeholder="120"
              />
              {validationErrors.systolic && (
                <span className="field-error">{validationErrors.systolic}</span>
              )}
            </div>
            <div className="form-field">
              <label htmlFor="diastolic">Bottom number (mmHg)</label>
              <input
                id="diastolic"
                type="number"
                value={formData.diastolic}
                onChange={(e) => handleInputChange('diastolic', e.target.value)}
                disabled={!isEditing}
                placeholder="80"
              />
              {validationErrors.diastolic && (
                <span className="field-error">{validationErrors.diastolic}</span>
              )}
            </div>
          </div>
          {validationErrors.bloodPressure && (
            <span className="field-error">{validationErrors.bloodPressure}</span>
          )}
        </div>

        <div className="form-section">
          <h3>Heart Rate</h3>
          <div className="form-field">
            <label htmlFor="heartRate">Beats per minute</label>
            <input
              id="heartRate"
              type="number"
              value={formData.heartRate}
              onChange={(e) => handleInputChange('heartRate', e.target.value)}
              disabled={!isEditing}
              placeholder="72"
              style={{ maxWidth: '200px' }}
            />
            {validationErrors.heartRate && (
              <span className="field-error">{validationErrors.heartRate}</span>
            )}
          </div>
        </div>

        <div className="form-section">
          <h3>Tests</h3>
          {formData.tests.map((test, index) => (
            <div key={index} className="dynamic-row">
              <div className="form-field">
                <label>Test name</label>
                <input
                  type="text"
                  value={test.name}
                  onChange={(e) => handleTestChange(index, 'name', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Blood sugar"
                />
              </div>
              <div className="form-field">
                <label>Result</label>
                <input
                  type="text"
                  value={test.result}
                  onChange={(e) => handleTestChange(index, 'result', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Normal"
                />
              </div>
              {isEditing && formData.tests.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTest(index)}
                  className="btn-remove"
                  aria-label="Remove test"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {isEditing && (
            <button type="button" onClick={addTest} className="btn btn-outline btn-small">
              + Add test
            </button>
          )}
        </div>

        <div className="form-section">
          <h3>Medications</h3>
          {formData.medications.map((med, index) => (
            <div key={index} className="medication-row">
              <div className="form-row">
                <div className="form-field">
                  <label>Medicine</label>
                  <input
                    type="text"
                    value={med.name}
                    onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Paracetamol"
                  />
                </div>
                <div className="form-field">
                  <label>Dose</label>
                  <input
                    type="text"
                    value={med.dose}
                    onChange={(e) => handleMedicationChange(index, 'dose', e.target.value)}
                    disabled={!isEditing}
                    placeholder="500mg"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>How often</label>
                  <input
                    type="text"
                    value={med.frequency}
                    onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Twice daily"
                  />
                </div>
                <div className="form-field">
                  <label>For how long</label>
                  <input
                    type="text"
                    value={med.duration}
                    onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                    disabled={!isEditing}
                    placeholder="7 days"
                  />
                </div>
              </div>
              {isEditing && formData.medications.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMedication(index)}
                  className="btn-remove"
                  aria-label="Remove medication"
                >
                  × Remove
                </button>
              )}
            </div>
          ))}
          {isEditing && (
            <button type="button" onClick={addMedication} className="btn btn-outline btn-small">
              + Add medicine
            </button>
          )}
        </div>

        <div className="form-section">
          <h3>Notes</h3>
          <div className="form-field">
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={!isEditing}
              placeholder="Any additional notes..."
              rows={4}
              maxLength={1000}
            />
            {isEditing && (
              <span className="char-count">{formData.notes.length}/1000</span>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="form-actions">
            <button 
              onClick={handleSave} 
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save and mark documented'}
            </button>
            {isDocumented && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  initializeForm(visit);
                  setValidationErrors({});
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitDetails;
