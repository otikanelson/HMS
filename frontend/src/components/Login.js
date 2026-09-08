import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Login.css';

const BACKGROUND_IMAGE =
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1920&q=80';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const Login = () => {
  // Modal and view state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [useUsernameLogin, setUseUsernameLogin] = useState(false);
  
  // Staff selection state
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffLoading, setStaffLoading] = useState(false);
  
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Notices state
  const [notices, setNotices] = useState([]);

  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const now = useClock();

  const from = location.state?.from?.pathname || '/dashboard';
  const timeString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const NOTICE_LABELS = { update: 'Update', info: 'Info', urgent: 'Urgent' };

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchStaffList = async () => {
    try {
      setStaffLoading(true);
      const response = await axios.get('/api/auth/staff-list');
      setStaffList(response.data.staff || []);
    } catch (err) {
      console.error('Failed to fetch staff list:', err);
      setErrors({ general: 'Failed to load staff list. Please try again.' });
    } finally {
      setStaffLoading(false);
    }
  };

  const fetchNotices = async () => {
    try {
      const response = await axios.get('/api/notices');
      setNotices(response.data.notices || []);
    } catch (err) {
      console.error('Failed to fetch notices:', err);
      setNotices([]);
    }
  };

  const formatNoticeDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleOpenStaffModal = () => {
    setShowStaffModal(true);
    fetchStaffList();
    setErrors({});
  };

  const handleCloseModal = () => {
    setShowStaffModal(false);
    setSelectedStaff(null);
    setPassword('');
    setShowPassword(false);
    setUseUsernameLogin(false);
    setUsername('');
    setErrors({});
  };

  const handleStaffSelect = (staff) => {
    setSelectedStaff(staff);
    setPassword('');
    setErrors({});
  };

  const handleBackToStaffList = () => {
    setSelectedStaff(null);
    setPassword('');
    setShowPassword(false);
    setErrors({});
  };

  const handleSwitchToUsername = () => {
    setUseUsernameLogin(true);
    setSelectedStaff(null);
    setPassword('');
    setUsername('');
    setErrors({});
  };

  const handleBackToStaffSelection = () => {
    setUseUsernameLogin(false);
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setErrors({});
  };

  const handleStaffPasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!password) {
      setErrors({ password: 'Password is required' });
      return;
    }

    const result = await login({ 
      username: selectedStaff.username, 
      password 
    });

    if (result.success) {
      handleCloseModal();
      if (result.user?.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } else {
      setErrors({ general: result.error });
    }
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!username) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const result = await login({ username, password });

    if (result.success) {
      handleCloseModal();
      if (result.user?.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } else {
      setErrors({ general: result.error });
    }
  };

  const getInitials = (fullName) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="lock-screen">
      <div className="lock-media" style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }} />
      <div className="lock-scrim" />

      <div className="lock-content">
        <div className="lock-clock">
          <div className="lock-time">{timeString}</div>
          <div className="lock-date">{dateString}</div>
        </div>

        <div className="lock-wrapper">
          {/* Simple Sign In Card */}
          <div className="lock-card">
            <div className="lock-brand">
              <div className="lock-brand-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <span>Tender Care Clinic</span>
            </div>

            <button
              type="button"
              onClick={handleOpenStaffModal}
              className="lock-submit"
              disabled={isLoading}
            >
              Sign In
            </button>

            <p className="lock-footnote">Hospital Management System</p>
          </div>

          {/* Notices Section */}
          {notices.length > 0 && (
            <div className="login-notices">
              <h3 className="login-notices-title">Staff Notices</h3>
              <div className="login-notices-list">
                {notices.map((notice) => (
                  <div key={notice._id} className={`login-notice login-notice-${notice.type}`}>
                    <div className="login-notice-header">
                      <span className="login-notice-badge">{NOTICE_LABELS[notice.type]}</span>
                      <span className="login-notice-date">{formatNoticeDate(notice.createdAt)}</span>
                    </div>
                    <h4 className="login-notice-title">{notice.title}</h4>
                    <p className="login-notice-body">{notice.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Staff Selection Modal */}
      {showStaffModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {!useUsernameLogin ? (
              // Staff Selection or Password Entry
              !selectedStaff ? (
                <>
                  <div className="modal-header">
                    <h2>Select Your Name</h2>
                    <p>Choose your name from the list below</p>
                  </div>

                  {errors.general && (
                    <div className="lock-error">{errors.general}</div>
                  )}

                  {staffLoading ? (
                    <div className="staff-list-loading">Loading staff list...</div>
                  ) : (
                    <div className="staff-selection-grid">
                      {staffList.map((staff) => (
                        <div
                          key={staff._id}
                          className="staff-card"
                          onClick={() => handleStaffSelect(staff)}
                        >
                          <div className="staff-avatar">
                            {getInitials(staff.fullName)}
                          </div>
                          <h3>{staff.fullName}</h3>
                          <p>{staff.roleDisplay}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="modal-footer">
                    <button
                      type="button"
                      onClick={handleSwitchToUsername}
                      className="link-button"
                    >
                      Sign in with username instead
                    </button>
                  </div>
                </>
              ) : (
                // Password entry for selected staff
                <>
                  <div className="modal-header">
                    <div className="selected-staff-info">
                      <div className="staff-avatar staff-avatar-large">
                        {getInitials(selectedStaff.fullName)}
                      </div>
                      <div className="selected-staff-details">
                        <h3 className="selected-staff-name">{selectedStaff.fullName}</h3>
                        <p className="selected-staff-role">{selectedStaff.roleDisplay}</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleStaffPasswordSubmit}>
                    {errors.general && (
                      <div className="lock-error">{errors.general}</div>
                    )}

                    <div className="lock-field">
                      <div className="lock-password-group">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`lock-input ${errors.password ? 'error' : ''}`}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password || errors.general) setErrors({});
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="lock-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {showPassword ? (
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                              </>
                            ) : (
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                      {errors.password && (
                        <span className="lock-field-error">{errors.password}</span>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="lock-submit"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="lock-spinner" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleBackToStaffList}
                      className="lock-back-btn"
                    >
                      ← Back to staff list
                    </button>
                  </form>
                </>
              )
            ) : (
              // Username/Password Login
              <>
                <div className="modal-header">
                  <h2>Sign In with Username</h2>
                  <p>For administrators and special accounts</p>
                </div>

                <form onSubmit={handleUsernameSubmit}>
                  {errors.general && (
                    <div className="lock-error">{errors.general}</div>
                  )}

                  <div className="lock-field">
                    <input
                      type="text"
                      className={`lock-input ${errors.username ? 'error' : ''}`}
                      placeholder="Username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (errors.username || errors.general) setErrors({});
                      }}
                      autoFocus
                    />
                    {errors.username && (
                      <span className="lock-field-error">{errors.username}</span>
                    )}
                  </div>

                  <div className="lock-field">
                    <div className="lock-password-group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={`lock-input ${errors.password ? 'error' : ''}`}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password || errors.general) setErrors({});
                        }}
                      />
                      <button
                        type="button"
                        className="lock-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {showPassword ? (
                            <>
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </>
                          ) : (
                            <>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                    {errors.password && (
                      <span className="lock-field-error">{errors.password}</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="lock-submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="lock-spinner" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToStaffSelection}
                    className="lock-back-btn"
                  >
                    ← Back to staff selection
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
