import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import logo from '../logo.png';
import './Login.css'; // Reuse Login styling

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await axios.put('/api/profile/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      // Store fresh tokens returned from the backend
      if (response.data.accessToken && response.data.refreshToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }

      // Update user state to reflect mustChangePassword: false
      // The AuthContext will pick this up on next API call or page refresh
      
      // Navigate to dashboard
      navigate('/dashboard', { replace: true });

    } catch (error) {
      console.error('Change password error:', error);
      
      // Show the backend's actual error message
      const errorMessage = error.response?.data?.error || 'Failed to change password. Please try again.';
      
      setErrors({
        general: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <button onClick={handleLogout} className="login-back" style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
          <span aria-hidden="true">&larr;</span>
          Sign out instead
        </button>

        <div className="login-header">
          <div className="login-logo">
            <img src={logo} alt="Tender Care Logo" width="48" height="48" />
          </div>
          <h1 className="login-title">Change Your Password</h1>
          <p className="login-subtitle">You're using a temporary password. Set your own before continuing.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {errors.general && (
            <div className="error-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 11-2 0 1 1 0 012 0zM8 7.5A.5.5 0 017.5 7H7a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h.5a.5.5 0 00.5-.5v-3z"/>
              </svg>
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="currentPassword" className="form-label">Current Password</label>
            <div className="password-input-group">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className={`form-input ${errors.currentPassword ? 'error' : ''}`}
                placeholder="Enter your current password"
                autoComplete="current-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="password-toggle"
                tabIndex="-1"
              >
                {showPasswords.current ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M10.79 12.912l-1.614-1.615a3.5 3.5 0 01-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.027 7.027 0 002.79-.588zM5.21 3.088A7.028 7.028 0 018 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 00-4.474-4.474L5.21 3.089z"/>
                    <path d="M5.525 7.646a2.5 2.5 0 002.829 2.829l-2.83-2.829zm4.95.708l-2.829-2.83a2.5 2.5 0 012.829 2.829zm3.171 6l-12-12 .708-.708 12 12-.708.708z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 011.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0114.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 011.172 8z"/>
                    <path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM4.5 8a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <div className="field-error">{errors.currentPassword}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">New Password</label>
            <div className="password-input-group">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className={`form-input ${errors.newPassword ? 'error' : ''}`}
                placeholder="Enter your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="password-toggle"
                tabIndex="-1"
              >
                {showPasswords.new ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M10.79 12.912l-1.614-1.615a3.5 3.5 0 01-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.027 7.027 0 002.79-.588zM5.21 3.088A7.028 7.028 0 018 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 00-4.474-4.474L5.21 3.089z"/>
                    <path d="M5.525 7.646a2.5 2.5 0 002.829 2.829l-2.83-2.829zm4.95.708l-2.829-2.83a2.5 2.5 0 012.829 2.829zm3.171 6l-12-12 .708-.708 12 12-.708.708z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 011.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0114.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 011.172 8z"/>
                    <path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM4.5 8a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.newPassword && (
              <div className="field-error">{errors.newPassword}</div>
            )}
            <div className="field-help" style={{ marginTop: '4px', fontSize: '13px', color: '#6b7280' }}>
              Must be at least 6 characters long
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
            <div className="password-input-group">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="password-toggle"
                tabIndex="-1"
              >
                {showPasswords.confirm ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M10.79 12.912l-1.614-1.615a3.5 3.5 0 01-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.027 7.027 0 002.79-.588zM5.21 3.088A7.028 7.028 0 018 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 00-4.474-4.474L5.21 3.089z"/>
                    <path d="M5.525 7.646a2.5 2.5 0 002.829 2.829l-2.83-2.829zm4.95.708l-2.829-2.83a2.5 2.5 0 012.829 2.829zm3.171 6l-12-12 .708-.708 12 12-.708.708z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 011.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0114.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 011.172 8z"/>
                    <path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM4.5 8a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="field-error">{errors.confirmPassword}</div>
            )}
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="spinner"></div>
                Changing Password...
              </>
            ) : (
              'Change Password'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-info" style={{ fontSize: '13px' }}>
            Logged in as <strong>{user?.fullName || 'User'}</strong>
          </p>
        </div>
      </div>

      <div className="login-visual" style={{ 
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div className="login-visual-scrim" />
        <div className="login-visual-caption">
          <span className="caption-brand">Secure Your Account</span>
          <p>Choose a strong password you'll remember. You can change it again later from your profile settings.</p>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
