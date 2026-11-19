import React, { useState } from 'react';
import axios from 'axios';
import './AddPatient.css';

const AddPatient = () => {
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'antenatal'

  // General patient form
  const [generalForm, setGeneralForm] = useState({
    patientId: '',
    fullName: '',
    phoneNumber: '+234'
  });

  // Antenatal patient form
  const [antenatalForm, setAntenatalForm] = useState({
    fullName: '',
    phoneNumber: '+234',
    address: ''
  });

  // Shared state
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [admitImmediately, setAdmitImmediately] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  const handleGeneralInputChange = (e) => {
    const { name, value } = e.target;
    let processed = value;

    if (name === 'patientId') {
      processed = value.replace(/\D/g, '').slice(0, 8);
    } else if (name === 'fullName') {
      processed = value.slice(0, 100);
    } else if (name === 'phoneNumber') {
      processed = formatPhoneNumber(value);
    }

    setGeneralForm(prev => ({ ...prev, [name]: processed }));
    if (error) setError('');
  };

  const handleAntenatalInputChange = (e) => {
    const { name, value } = e.target;
    let processed = value;

    if (name === 'fullName') {
      processed = value.slice(0, 100);
    } else if (name === 'phoneNumber') {
      processed = formatPhoneNumber(value);
    } else if (name === 'address') {
      processed = value.slice(0, 200);
    }

    setAntenatalForm(prev => ({ ...prev, [name]: processed }));
    if (error) setError('');
  };

  const formatPhoneNumber = (value) => {
    let cleanValue = value.replace(/[^\d+]/g, '');

    if (cleanValue === '' || cleanValue === '+') {
      return '+234';
    } else if (cleanValue.startsWith('+2340')) {
      return '+234' + cleanValue.substring(5).slice(0, 10);
    } else if (cleanValue.startsWith('0')) {
      return '+234' + cleanValue.substring(1).slice(0, 10);
    } else if (cleanValue.startsWith('234')) {
      return '+' + cleanValue.slice(0, 13);
    } else if (cleanValue.startsWith('+234')) {
      const afterCountryCode = cleanValue.substring(4);
      if (afterCountryCode.startsWith('0')) {
        return '+234' + afterCountryCode.substring(1).slice(0, 10);
      } else {
        return cleanValue.slice(0, 14);
      }
    } else if (cleanValue.startsWith('+')) {
      if (cleanValue.length > 1 && !cleanValue.startsWith('+234')) {
        return '+234';
      } else {
        return cleanValue.slice(0, 14);
      }
    } else {
      if (cleanValue.startsWith('0')) {
        return '+234' + cleanValue.substring(1).slice(0, 10);
      } else {
        return '+234' + cleanValue.slice(0, 10);
      }
    }
  };

  const addCustomField = () => {
    if (customFields.length < 20) {
      setCustomFields([...customFields, { fieldName: '', fieldValue: '' }]);
    }
  };

  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index, key, value) => {
    const updated = [...customFields];
    updated[index][key] = value.slice(0, key === 'fieldName' ? 60 : 200);
    setCustomFields(updated);
  };

  const validateForm = () => {
    const errors = [];

    if (activeTab === 'general') {
      if (!generalForm.patientId.trim()) {
        errors.push('Patient ID is required');
      } else if (!/^\d{1,8}$/.test(generalForm.patientId.trim())) {
        errors.push('Patient ID must be 1-8 digits');
      }

      if (!generalForm.fullName.trim()) {
        errors.push('Full name is required');
      } else if (generalForm.fullName.trim().length < 2) {
        errors.push('Full name must be at least 2 characters');
      }

      if (!generalForm.phoneNumber.trim()) {
        errors.push('Phone number is required');
      } else if (!/^\+234\d{10}$/.test(generalForm.phoneNumber.trim())) {
        errors.push('Phone number must be +234XXXXXXXXXX');
      }
    } else {
      if (!antenatalForm.fullName.trim()) {
        errors.push('Full name is required');
      } else if (antenatalForm.fullName.trim().length < 2) {
        errors.push('Full name must be at least 2 characters');
      }

      if (antenatalForm.phoneNumber.trim() && !/^\+234\d{10}$/.test(antenatalForm.phoneNumber.trim())) {
        errors.push('Phone number must be +234XXXXXXXXXX or empty');
      }

      if (!antenatalForm.address.trim()) {
        errors.push('Address is required for antenatal patients');
      } else if (antenatalForm.address.trim().length < 2) {
        errors.push('Address must be at least 2 characters');
      }
    }

    // Validate custom fields
    const nonEmptyFields = customFields.filter(f => f.fieldName.trim() || f.fieldValue.trim());
    if (nonEmptyFields.length > 0) {
      const fieldNames = new Set();
      for (const field of nonEmptyFields) {
        if (!field.fieldName.trim()) {
          errors.push('Give this field a name');
          break;
        }
        const lowerName = field.fieldName.toLowerCase();
        if (fieldNames.has(lowerName)) {
          errors.push('Two fields cannot share the same name');
          break;
        }
        fieldNames.add(lowerName);
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Prepare custom fields for submission
      const processedCustomFields = customFields
        .filter(f => f.fieldName.trim() || f.fieldValue.trim())
        .map(f => ({
          fieldName: f.fieldName.trim(),
          fieldValue: f.fieldValue.trim()
        }));

      let patientData;
      if (activeTab === 'general') {
        patientData = {
          patientType: 'general',
          patientId: generalForm.patientId.trim(),
          fullName: generalForm.fullName.trim(),
          phoneNumber: generalForm.phoneNumber.trim(),
          customFields: processedCustomFields
        };
      } else {
        patientData = {
          patientType: 'antenatal',
          fullName: antenatalForm.fullName.trim(),
          phoneNumber: antenatalForm.phoneNumber.trim(),
          address: antenatalForm.address.trim(),
          customFields: processedCustomFields
        };
      }

      const response = await axios.post('/api/patients', patientData);
      const patient = response.data.patient;

      // If "Admit Immediately" is checked, update patient status
      if (admitImmediately) {
        try {
          await axios.put(`/api/patients/${patient.patientId}/status`, {
            status: 'admitted'
          });
        } catch (statusErr) {
          console.error('Failed to admit patient:', statusErr);
        }
      }

      // Show success message with antenatal number if applicable
      if (activeTab === 'antenatal') {
        const ancNumber = patient.displayNumber;
        setSuccess(`Saved. Antenatal number: ${ancNumber} — write this on her booklet.`);
      } else {
        setSuccess('Patient file created successfully.');
      }

      // Reset form
      setGeneralForm({ patientId: '', fullName: '', phoneNumber: '+234' });
      setAntenatalForm({ fullName: '', phoneNumber: '+234', address: '' });
      setCustomFields([]);
      setAdmitImmediately(false);

      // Focus on first field for quick re-entry
      setTimeout(() => {
        const firstInput = document.querySelector('.add-patient input[type="text"]:first-of-type');
        if (firstInput) firstInput.focus();
      }, 100);

    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data.message || 'Invalid patient data');
      } else if (err.response?.status === 409) {
        setError('Patient ID already exists. Please use a different ID.');
      } else {
        setError('Failed to add patient. Please try again.');
      }
      console.error('Add patient error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    setGeneralForm({ patientId: '', fullName: '', phoneNumber: '+234' });
    setAntenatalForm({ fullName: '', phoneNumber: '+234', address: '' });
    setCustomFields([]);
    setAdmitImmediately(false);
    setError('');
    setSuccess('');
  };

  return (
    <div className="add-patient">
      <div className="add-patient-header">
        <h1>Add New Patient File</h1>
        <p>Index a new patient file in the system</p>
      </div>

      <div className="form-container">
        {/* Tab buttons */}
        <div className="tab-buttons">
          <button
            type="button"
            className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => handleTabChange('general')}
          >
            General patient
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'antenatal' ? 'active' : ''}`}
            onClick={() => handleTabChange('antenatal')}
          >
            Antenatal patient
          </button>
        </div>

        <form onSubmit={handleSubmit} className="patient-form">
          {/* GENERAL PATIENT FORM */}
          {activeTab === 'general' && (
            <>
              <div className="form-section">
                <h3>Patient Information</h3>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="gen-patientId">Patient ID *</label>
                    <input
                      type="text"
                      id="gen-patientId"
                      name="patientId"
                      value={generalForm.patientId}
                      onChange={handleGeneralInputChange}
                      placeholder="e.g., 12001"
                      inputMode="numeric"
                      maxLength="8"
                      required
                    />
                    <small>1-8 digit unique identifier</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="gen-fullName">Full Name *</label>
                    <input
                      type="text"
                      id="gen-fullName"
                      name="fullName"
                      value={generalForm.fullName}
                      onChange={handleGeneralInputChange}
                      placeholder="e.g., Adebayo Okafor"
                      maxLength="100"
                      required
                    />
                    <small>Patient's complete name</small>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="gen-phoneNumber">Phone Number *</label>
                  <input
                    type="tel"
                    id="gen-phoneNumber"
                    name="phoneNumber"
                    value={generalForm.phoneNumber}
                    onChange={handleGeneralInputChange}
                    placeholder="+2348012345678"
                    maxLength="14"
                    required
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Patient Information (continued)</h3>
                <button
                  type="button"
                  className="btn-add-field"
                  onClick={addCustomField}
                  disabled={customFields.length >= 20}
                >
                  Add field
                </button>
                {customFields.length >= 20 && (
                  <small className="disabled-text">You can add up to 20 fields</small>
                )}
              </div>
            </>
          )}

          {/* ANTENATAL PATIENT FORM */}
          {activeTab === 'antenatal' && (
            <>
              <div className="form-section">
                <h3>Patient Information</h3>

                <div className="antenatal-notice">
                  A number is given automatically (ANC-0001, ANC-0002…).
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ant-fullName">Full Name *</label>
                    <input
                      type="text"
                      id="ant-fullName"
                      name="fullName"
                      value={antenatalForm.fullName}
                      onChange={handleAntenatalInputChange}
                      placeholder="e.g., Adebayo Okafor"
                      maxLength="100"
                      required
                    />
                    <small>Patient's complete name</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="ant-phoneNumber">Phone Number</label>
                    <input
                      type="tel"
                      id="ant-phoneNumber"
                      name="phoneNumber"
                      value={antenatalForm.phoneNumber}
                      onChange={handleAntenatalInputChange}
                      placeholder="+2348012345678"
                      maxLength="14"
                    />
                    <small>Optional</small>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="ant-address">Home address *</label>
                  <textarea
                    id="ant-address"
                    name="address"
                    value={antenatalForm.address}
                    onChange={handleAntenatalInputChange}
                    placeholder="Enter patient's home address"
                    rows="2"
                    maxLength="200"
                    required
                  />
                  <small>{antenatalForm.address.length}/200 characters</small>
                </div>
              </div>

              <div className="form-section">
                <h3>Patient Information (continued)</h3>
                <button
                  type="button"
                  className="btn-add-field"
                  onClick={addCustomField}
                  disabled={customFields.length >= 20}
                >
                  Add field
                </button>
                {customFields.length >= 20 && (
                  <small className="disabled-text">You can add up to 20 fields</small>
                )}
              </div>
            </>
          )}

          {/* CUSTOM FIELDS */}
          {customFields.length > 0 && (
            <div className="custom-fields-section">
              <h4>Extra details</h4>
              {customFields.map((field, index) => (
                <div key={index} className="custom-field-row">
                  <input
                    type="text"
                    placeholder="Field name"
                    value={field.fieldName}
                    onChange={(e) => updateCustomField(index, 'fieldName', e.target.value)}
                    className="field-name-input"
                    autoFocus={index === customFields.length - 1}
                  />
                  <input
                    type="text"
                    placeholder="Details"
                    value={field.fieldValue}
                    onChange={(e) => updateCustomField(index, 'fieldValue', e.target.value)}
                    className="field-value-input"
                  />
                  <button
                    type="button"
                    className="btn-remove-field"
                    onClick={() => removeCustomField(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ADMIT IMMEDIATELY */}
          <div className="form-section">
            <h3>Patient Status</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={admitImmediately}
                onChange={(e) => setAdmitImmediately(e.target.checked)}
              />
              <span>Admit patient immediately</span>
            </label>
          </div>

          {/* MESSAGES AND BUTTONS */}
          <div className="form-actions">
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <div className="action-buttons">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearForm}
                disabled={loading}
              >
                Clear Form
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Patient File'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatient;
