import React, { useState } from 'react';
import axios from 'axios';
import { FiUser, FiFolder } from 'react-icons/fi';
import './AddPatient.css';

const AddPatient = () => {
  const [formData, setFormData] = useState({
    patientId: '',
    fullName: '',
    phoneNumber: '+234',
    cabinetNumber: '',
    shelfNumber: '',
    folderNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Real-time validation helpers
  const getFieldValidationClass = (fieldName) => {
    if (!formData[fieldName]) return 'form-control';
    
    const value = formData[fieldName].toString().trim();
    let isValid = false;

    switch (fieldName) {
      case 'patientId':
        isValid = /^\d{4,8}$/.test(value);
        break;
      case 'fullName':
        isValid = value.length >= 2 && value.length <= 100;
        break;
      case 'phoneNumber':
        isValid = /^\+234\d{10}$/.test(value);
        break;
      case 'cabinetNumber':
        const cabinet = parseInt(value);
        isValid = cabinet >= 1 && cabinet <= 50;
        break;
      case 'shelfNumber':
        const shelf = parseInt(value);
        isValid = shelf >= 1 && shelf <= 20;
        break;
      case 'folderNumber':
        const folder = parseInt(value);
        isValid = folder >= 1 && folder <= 100;
        break;
      default:
        isValid = true;
    }

    return `form-control ${isValid ? 'valid' : 'invalid'}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Apply specific formatting and constraints based on field
    switch (name) {
      case 'patientId':
        // Only allow digits, max 8 characters
        processedValue = value.replace(/\D/g, '').slice(0, 8);
        break;
      
      case 'fullName':
        // Allow letters, spaces, apostrophes, hyphens, max 100 chars
        processedValue = value.slice(0, 100);
        break;
      
      case 'phoneNumber':
        // Smart phone number formatting for Nigerian numbers
        let cleanValue = value.replace(/[^\d+]/g, ''); // Remove all non-digits except +
        
        // Handle different input scenarios
        if (cleanValue === '' || cleanValue === '+') {
          processedValue = '+234';
        } else if (cleanValue.startsWith('+2340')) {
          // Remove the accidental 0 after +234
          processedValue = '+234' + cleanValue.substring(5).slice(0, 10);
        } else if (cleanValue.startsWith('0')) {
          // Convert 0801234567 to +2348012345678
          const withoutLeadingZero = cleanValue.substring(1);
          processedValue = '+234' + withoutLeadingZero.slice(0, 10); // Max 10 digits after +234
        } else if (cleanValue.startsWith('234')) {
          // Convert 2348012345678 to +2348012345678
          processedValue = '+' + cleanValue.slice(0, 13); // Max 13 digits total (+234xxxxxxxxxx)
        } else if (cleanValue.startsWith('+234')) {
          // Already correct format, just limit length and check for accidental 0
          const afterCountryCode = cleanValue.substring(4);
          if (afterCountryCode.startsWith('0')) {
            // Remove accidental 0 after +234
            processedValue = '+234' + afterCountryCode.substring(1).slice(0, 10);
          } else {
            processedValue = cleanValue.slice(0, 14); // +234 + 10 digits = 14 chars
          }
        } else if (cleanValue.startsWith('+')) {
          // Handle other country codes or malformed +234
          if (cleanValue.length > 1 && !cleanValue.startsWith('+234')) {
            processedValue = '+234';
          } else {
            processedValue = cleanValue.slice(0, 14);
          }
        } else {
          // Raw digits without country code - assume Nigerian
          // If starts with 0, remove it
          if (cleanValue.startsWith('0')) {
            processedValue = '+234' + cleanValue.substring(1).slice(0, 10);
          } else {
            processedValue = '+234' + cleanValue.slice(0, 10);
          }
        }
        break;
      
      case 'cabinetNumber':
      case 'shelfNumber':
      case 'folderNumber':
        // Only allow digits, and enforce max values
        processedValue = value.replace(/\D/g, '');
        
        if (name === 'cabinetNumber') {
          processedValue = processedValue.slice(0, 2); // Max 2 digits for cabinet (50)
          const num = parseInt(processedValue);
          if (num > 50) processedValue = '50';
        } else if (name === 'shelfNumber') {
          processedValue = processedValue.slice(0, 2); // Max 2 digits for shelf (20)
          const num = parseInt(processedValue);
          if (num > 20) processedValue = '20';
        } else if (name === 'folderNumber') {
          processedValue = processedValue.slice(0, 3); // Max 3 digits for folder (100)
          const num = parseInt(processedValue);
          if (num > 100) processedValue = '100';
        }
        break;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    const errors = [];

    // Patient ID validation - must be 4-8 digits
    if (!formData.patientId.trim()) {
      errors.push('Patient ID is required');
    } else if (!/^\d{4,8}$/.test(formData.patientId.trim())) {
      errors.push('Patient ID must be 4-8 digits (e.g., 12001)');
    }

    // Full Name validation - 2-100 characters
    if (!formData.fullName.trim()) {
      errors.push('Patient name is required');
    } else if (formData.fullName.trim().length < 2) {
      errors.push('Patient name must be at least 2 characters');
    } else if (formData.fullName.trim().length > 100) {
      errors.push('Patient name cannot exceed 100 characters');
    }

    // Phone Number validation - must be +234 followed by 10 digits
    if (!formData.phoneNumber.trim()) {
      errors.push('Phone number is required');
    } else {
      const phone = formData.phoneNumber.trim();
      if (!/^\+234\d{10}$/.test(phone)) {
        errors.push('Phone number must be in format +234XXXXXXXXXX (10 digits after +234)');
      }
    }

    // Cabinet Number validation
    const cabinet = parseInt(formData.cabinetNumber);
    if (!cabinet || cabinet < 1 || cabinet > 50) {
      errors.push('Cabinet number must be between 1 and 50');
    }

    // Shelf Number validation
    const shelf = parseInt(formData.shelfNumber);
    if (!shelf || shelf < 1 || shelf > 20) {
      errors.push('Shelf number must be between 1 and 20');
    }

    // Folder Number validation
    const folder = parseInt(formData.folderNumber);
    if (!folder || folder < 1 || folder > 100) {
      errors.push('Folder number must be between 1 and 100');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      // Scroll to the error message near the submit button
      setTimeout(() => {
        const errorElement = document.querySelector('.form-actions .error');
        if (errorElement) {
          errorElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const patientData = {
        patientId: formData.patientId.trim(),
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        cabinetNumber: parseInt(formData.cabinetNumber),
        shelfNumber: parseInt(formData.shelfNumber),
        folderNumber: parseInt(formData.folderNumber)
      };

      const response = await axios.post('/api/patients', patientData);
      
      // Handle different possible response structures
      let location;
      if (response.data.patient?.locationDisplay) {
        location = response.data.patient.locationDisplay;
      } else if (response.data.locationDisplay) {
        location = response.data.locationDisplay;
      } else {
        // Fallback: construct location from form data
        location = `Cabinet ${patientData.cabinetNumber} → Shelf ${patientData.shelfNumber} → Folder ${patientData.folderNumber}`;
      }
      
      setSuccess(`Patient file indexed successfully! Location: ${location}`);
      
      // Scroll to success message
      setTimeout(() => {
        const successElement = document.querySelector('.form-actions .success');
        if (successElement) {
          successElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      
      // Reset form
      setFormData({
        patientId: '',
        fullName: '',
        phoneNumber: '+234',
        cabinetNumber: '',
        shelfNumber: '',
        folderNumber: ''
      });

    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data.message || 'Invalid patient data');
      } else if (err.response?.status === 409) {
        setError('Patient ID already exists. Please use a different ID.');
      } else {
        setError('Failed to add patient. Please try again.');
      }
      console.error('Add patient error:', err);
      
      // Scroll to error message
      setTimeout(() => {
        const errorElement = document.querySelector('.form-actions .error');
        if (errorElement) {
          errorElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    setFormData({
      patientId: '',
      fullName: '',
      phoneNumber: '+234',
      cabinetNumber: '',
      shelfNumber: '',
      folderNumber: ''
    });
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
        <form onSubmit={handleSubmit} className="patient-form">
          <div className="form-section">
            <h3><FiUser className="section-icon" /> Patient Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="patientId">Patient ID *</label>
                <input
                  type="text"
                  id="patientId"
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleInputChange}
                  placeholder="e.g., 12001"
                  className={getFieldValidationClass('patientId')}
                  pattern="\d{4,8}"
                  maxLength="8"
                  required
                />
                <small className="form-help">4-8 digit unique identifier</small>
              </div>

              <div className="form-group">
                <label htmlFor="fullName">Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="e.g., Adebayo Okafor"
                  className={getFieldValidationClass('fullName')}
                  minLength="2"
                  maxLength="100"
                  required
                />
                <small className="form-help">Patient's complete name (2-100 characters)</small>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number *</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+2348012345678"
                className={getFieldValidationClass('phoneNumber')}
                maxLength="14"
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h3><FiFolder className="section-icon" /> File Location</h3>
            <p className="location-description">
              Specify where this patient's physical file is stored
            </p>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cabinetNumber">Cabinet Number *</label>
                <input
                  type="text"
                  id="cabinetNumber"
                  name="cabinetNumber"
                  value={formData.cabinetNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 2"
                  className={getFieldValidationClass('cabinetNumber')}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="2"
                  required
                />
                <small className="form-help">Cabinet 1-50</small>
              </div>

              <div className="form-group">
                <label htmlFor="shelfNumber">Shelf Number *</label>
                <input
                  type="text"
                  id="shelfNumber"
                  name="shelfNumber"
                  value={formData.shelfNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 3"
                  className={getFieldValidationClass('shelfNumber')}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="2"
                  required
                />
                <small className="form-help">Shelf 1-20</small>
              </div>

              <div className="form-group">
                <label htmlFor="folderNumber">Folder Number *</label>
                <input
                  type="text"
                  id="folderNumber"
                  name="folderNumber"
                  value={formData.folderNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 21"
                  className={getFieldValidationClass('folderNumber')}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="3"
                  required
                />
                <small className="form-help">Folder 1-100</small>
              </div>
            </div>

            {(formData.cabinetNumber || formData.shelfNumber || formData.folderNumber) && (
              <div className="location-preview">
                <strong>File Location Preview:</strong>
                <div className="preview-location">
                  Cabinet {formData.cabinetNumber || '?'} → 
                  Shelf {formData.shelfNumber || '?'} → 
                  Folder {formData.folderNumber || '?'}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            {error && (
              <div className="error">
                {error}
              </div>
            )}

            {success && (
              <div className="success">
                {success}
              </div>
            )}

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
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Adding...
                  </>
                ) : (
                  'Add Patient File'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatient;