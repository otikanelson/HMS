import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AddPatient.css'; // Reuse AddPatient styling

const AddStaff = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [createdStaff, setCreatedStaff] = useState(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    otherNames: '',
    role: '',
    accessLevel: '',
    phoneNumber: '',
    email: '',
    shift: 'DAY',
    salary: '',
    bankAccount: '',
    accountNumber: ''
  });

  const [validationState, setValidationState] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    
    // Clear validation state for this field
    if (validationState[name]) {
      setValidationState(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'firstName':
      case 'lastName':
        if (value.trim().length < 2) {
          return { valid: false, message: 'Must be at least 2 characters' };
        }
        if (!/^[a-zA-Z\s'\-]+$/.test(value)) {
          return { valid: false, message: 'Only letters, spaces, apostrophes, and hyphens allowed' };
        }
        return { valid: true };

      case 'phoneNumber':
        if (value && !/^\+234\d{10}$/.test(value)) {
          return { valid: false, message: 'Format: +234XXXXXXXXXX (10 digits after +234)' };
        }
        return { valid: true };

      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return { valid: false, message: 'Invalid email format' };
        }
        return { valid: true };

      case 'salary':
        if (value && (isNaN(value) || parseFloat(value) < 0)) {
          return { valid: false, message: 'Must be a positive number' };
        }
        return { valid: true };

      case 'accountNumber':
        if (value && !/^\d{10}$/.test(value)) {
          return { valid: false, message: 'Must be exactly 10 digits' };
        }
        return { valid: true };

      default:
        return { valid: true };
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const validation = validateField(name, value);
    setValidationState(prev => ({ ...prev, [name]: validation }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validate all required fields
    const requiredFields = ['firstName', 'lastName', 'role', 'accessLevel'];
    const missingFields = requiredFields.filter(field => !formData[field].trim());
    
    if (missingFields.length > 0) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    // Validate all fields
    const allValidations = {};
    Object.keys(formData).forEach(key => {
      const validation = validateField(key, formData[key]);
      if (!validation.valid) {
        allValidations[key] = validation;
      }
    });

    if (Object.keys(allValidations).length > 0) {
      setValidationState(allValidations);
      setError('Please fix validation errors before submitting');
      setIsSubmitting(false);
      return;
    }

    try {
      // Prepare data for submission
      const submitData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        otherNames: formData.otherNames.trim() || undefined,
        role: formData.role,
        accessLevel: formData.accessLevel,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        email: formData.email.trim() || undefined,
        shift: formData.shift,
        salary: formData.salary ? parseFloat(formData.salary) : undefined,
        bankAccount: formData.bankAccount.trim() || undefined,
        accountNumber: formData.accountNumber.trim() || undefined
      };

      const response = await axios.post('/api/staff', submitData);
      
      // Check if login credentials were created
      if (response.data.loginCredentials) {
        if (response.data.loginCredentials.error) {
          // Staff created but login failed
          setCreatedStaff(response.data.staff);
          setCredentials({ error: true, message: response.data.loginCredentials.error });
          setShowCredentials(true);
        } else {
          // Success - show credentials
          setCreatedStaff(response.data.staff);
          setCredentials(response.data.loginCredentials);
          setShowCredentials(true);
        }
      } else {
        // No credentials in response (shouldn't happen, but handle gracefully)
        navigate('/staff');
      }

    } catch (err) {
      console.error('Add staff error:', err);
      setError(
        err.response?.data?.message || 
        err.response?.data?.error || 
        'Failed to add staff member. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (credentials && !credentials.error) {
      const text = `Username: ${credentials.username}\nTemporary Password: ${credentials.temporaryPassword}`;
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleDone = () => {
    navigate('/staff');
  };

  const handleCancel = () => {
    navigate('/staff');
  };

  // Show credentials screen
  if (showCredentials) {
    if (credentials?.error) {
      // Staff created but login failed
      return (
        <div className="add-patient">
          <div className="add-patient-header">
            <h1>⚠️ Partial Success</h1>
            <p>Staff record created, but login account setup failed</p>
          </div>

          <div className="form-container">
            <div className="patient-form">
              <div className="form-section">
                <div className="alert alert-warning" style={{
                  background: '#fff3cd',
                  color: '#856404',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #ffeeba',
                  marginBottom: '20px'
                }}>
                  <p style={{ fontSize: '16px', marginBottom: '12px' }}>
                    <strong>{createdStaff?.fullName}'s</strong> staff record was saved successfully, 
                    but their login account couldn't be created automatically.
                  </p>
                  <p style={{ fontSize: '14px', marginBottom: '0' }}>
                    They won't be able to sign in yet. Please contact technical support 
                    to set up their account manually.
                  </p>
                </div>

                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '16px', 
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0', fontSize: '14px', color: '#495057' }}>
                    <strong>Staff ID:</strong> {createdStaff?.staffId}
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#495057' }}>
                    <strong>Role:</strong> {createdStaff?.roleDisplay}
                  </p>
                </div>
              </div>

              <div className="form-actions">
                <div className="action-buttons">
                  <button
                    type="button"
                    onClick={handleDone}
                    className="btn btn-primary"
                  >
                    Go to Staff List
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Success - show credentials
    return (
      <div className="add-patient">
        <div className="add-patient-header">
          <h1>🎉 Staff Member Added!</h1>
          <p>Login account created successfully</p>
        </div>

        <div className="form-container">
          <div className="patient-form">
            <div className="form-section">
              <div className="alert" style={{
                background: '#d1ecf1',
                color: '#0c5460',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #bee5eb',
                marginBottom: '20px',
                fontSize: '15px',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                ⚠️ This password will only be shown once. Write it down or share it with {createdStaff?.fullName} now.
              </div>

              <div style={{
                background: '#f8f9fa',
                padding: '24px',
                borderRadius: '8px',
                border: '3px solid #007bff',
                marginBottom: '20px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '600',
                    color: '#6c757d',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Username (Employee ID)
                  </label>
                  <div style={{
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#2c3e50',
                    padding: '12px 16px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '2px solid #dee2e6'
                  }}>
                    {credentials.username}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '600',
                    color: '#6c757d',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Temporary Password
                  </label>
                  <div style={{
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#dc3545',
                    padding: '12px 16px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '2px solid #dee2e6'
                  }}>
                    {credentials.temporaryPassword}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                >
                  {copied ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                      </svg>
                      Copy to Clipboard
                    </>
                  )}
                </button>
              </div>

              <div style={{
                background: '#fff3cd',
                color: '#856404',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #ffeeba',
                fontSize: '14px',
                marginBottom: '20px'
              }}>
                <strong>Important:</strong> The staff member must change this password on their first login.
              </div>
            </div>

            <div className="form-actions">
              <div className="action-buttons">
                <button
                  type="button"
                  onClick={handleDone}
                  className="btn btn-primary"
                >
                  ✓ I've saved this — Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show form
  return (
    <div className="add-patient">
      <div className="add-patient-header">
        <h1>Add New Staff Member</h1>
        <p>Create a staff record and login account</p>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="patient-form">
          {/* Personal Information */}
          <div className="form-section">
            <h3>
              <span className="section-icon">👤</span>
              Personal Information
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">
                  First Name <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`form-control ${
                    validationState.firstName?.valid === false ? 'invalid' : 
                    validationState.firstName?.valid === true ? 'valid' : ''
                  }`}
                  required
                />
                {validationState.firstName?.message && (
                  <span className="form-help" style={{ color: '#dc3545' }}>
                    {validationState.firstName.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">
                  Last Name <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`form-control ${
                    validationState.lastName?.valid === false ? 'invalid' : 
                    validationState.lastName?.valid === true ? 'valid' : ''
                  }`}
                  required
                />
                {validationState.lastName?.message && (
                  <span className="form-help" style={{ color: '#dc3545' }}>
                    {validationState.lastName.message}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="otherNames">Other Names (Optional)</label>
              <input
                type="text"
                id="otherNames"
                name="otherNames"
                value={formData.otherNames}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>
          </div>

          {/* Job Role & System Access */}
          <div className="form-section">
            <h3>
              <span className="section-icon">💼</span>
              Job Role & System Access
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="role">
                  Clinical Job Title <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                >
                  <option value="">Select job title...</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="NURSE">Nurse</option>
                  <option value="TRAINEE_NURSE">Trainee Nurse</option>
                  <option value="MIDWIFE">Midwife</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
                <span className="form-help">Their clinical role at the facility</span>
              </div>

              <div className="form-group">
                <label htmlFor="accessLevel">
                  System Access Level <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <select
                  id="accessLevel"
                  name="accessLevel"
                  value={formData.accessLevel}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                  style={!formData.accessLevel ? { color: '#6c757d' } : {}}
                >
                  <option value="">Choose access level...</option>
                  <option value="ADMINISTRATOR">Administrator</option>
                  <option value="RECORDS_OPERATOR">Records Operator</option>
                  <option value="CLINICAL_STAFF">Clinical Staff</option>
                </select>
                <span className="form-help">Controls what they can do in the system</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="shift">
                Shift <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <select
                id="shift"
                name="shift"
                value={formData.shift}
                onChange={handleInputChange}
                className="form-control"
                required
              >
                <option value="DAY">Day Shift</option>
                <option value="NIGHT">Night Shift</option>
              </select>
            </div>
          </div>

          {/* Contact Information */}
          <div className="form-section">
            <h3>
              <span className="section-icon">📞</span>
              Contact Information
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number (Optional)</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`form-control ${
                    validationState.phoneNumber?.valid === false ? 'invalid' : 
                    validationState.phoneNumber?.valid === true ? 'valid' : ''
                  }`}
                  placeholder="+234XXXXXXXXXX"
                />
                {validationState.phoneNumber?.message && (
                  <span className="form-help" style={{ color: '#dc3545' }}>
                    {validationState.phoneNumber.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email (Optional)</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`form-control ${
                    validationState.email?.valid === false ? 'invalid' : 
                    validationState.email?.valid === true ? 'valid' : ''
                  }`}
                  placeholder="name@example.com"
                />
                {validationState.email?.message && (
                  <span className="form-help" style={{ color: '#dc3545' }}>
                    {validationState.email.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Payroll Information */}
          <div className="form-section">
            <h3>
              <span className="section-icon">💰</span>
              Payroll Information (Optional)
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="salary">Monthly Salary (₦)</label>
                <input
                  type="number"
                  id="salary"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`form-control ${
                    validationState.salary?.valid === false ? 'invalid' : 
                    validationState.salary?.valid === true ? 'valid' : ''
                  }`}
                  placeholder="e.g. 60000"
                  min="0"
                  step="1000"
                />
                {validationState.salary?.message && (
                  <span className="form-help" style={{ color: '#dc3545' }}>
                    {validationState.salary.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="bankAccount">Bank Name</label>
                <input
                  type="text"
                  id="bankAccount"
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="e.g. First Bank of Nigeria"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="accountNumber">Account Number</label>
              <input
                type="text"
                id="accountNumber"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={`form-control ${
                  validationState.accountNumber?.valid === false ? 'invalid' : 
                  validationState.accountNumber?.valid === true ? 'valid' : ''
                }`}
                placeholder="10-digit account number"
                maxLength="10"
              />
              {validationState.accountNumber?.message && (
                <span className="form-help" style={{ color: '#dc3545' }}>
                  {validationState.accountNumber.message}
                </span>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            {error && <div className="error">{error}</div>}

            <div className="action-buttons">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
                    </svg>
                    Add Staff Member
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaff;
