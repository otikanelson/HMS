import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './Login.css';

const BACKGROUND_IMAGE =
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1920&q=80';

const AUTO_OPEN_PICKER = false;

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const Login = () => {
  // Stage management
  const [stage, setStage] = useState('lock');

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
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  
  // Notices state
  const [notices, setNotices] = useState([]);

  // Drag state
  const [dragState, setDragState] = useState({ isDragging: false, startY: 0, currentY: 0, pointerId: null });
  const lockLayerRef = useRef(null);

  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const now = useClock();

  const from = location.state?.from?.pathname || '/dashboard';

  // Lagos time formatting
  const lockTime = now.toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit'
  });

  const lockDate = now.toLocaleDateString('en-US', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const timeString = now.toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit'
  });

  const dateString = now.toLocaleDateString('en-US', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const NOTICE_LABELS = { update: 'Update', info: 'Info', urgent: 'Urgent' };

  // Hash function for avatar colors
  const hashCode = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash);
  };
  
  const getAvatarColor = (name) => {
    const colors = [
      '#be185d', // magenta
      '#0e7490', // teal
      '#1d4ed8', // blue
      '#c2410c', // orange
      '#7c3aed', // purple
      '#0f766e'  // green
    ];
    const index = hashCode(name) % colors.length;
    return colors[index];
  };

  // Reveal lock screen and go to sign-in
  const reveal = () => {
    setStage('signin');
    // Focus the sign-in button on sign-in page after transition
    setTimeout(() => {
      if (AUTO_OPEN_PICKER) {
        handleOpenStaffModal();
      } else {
        const signInBtn = document.querySelector('.lock-submit');
        if (signInBtn) signInBtn.focus();
      }
    }, 50);
  };

  // Double-click handler for lock layer
  const handleLockLayerDoubleClick = (e) => {
    // Ignore if clicking inside notices list
    if (e.target.closest('.lock-notices')) return;
    reveal();
  };

  // Pointer events for drag-to-unlock
  const handlePointerDown = (e) => {
    // Ignore if clicking inside interactive elements or notices
    if (e.target.closest('button, a, input, .lock-notices')) return;
    
    const dy = e.clientY;
    setDragState({
      isDragging: true,
      startY: dy,
      currentY: 0,
      pointerId: e.pointerId
    });
    lockLayerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragState.isDragging || e.pointerId !== dragState.pointerId) return;

    const movement = e.clientY - dragState.startY;
    // Only track upward movement
    const currentY = Math.min(0, movement);

    setDragState(prev => ({
      ...prev,
      currentY
    }));
  };

  const handlePointerUp = (e) => {
    if (!dragState.isDragging || e.pointerId !== dragState.pointerId) return;

    const movement = Math.abs(dragState.currentY);
    const threshold = Math.min(100, window.innerHeight * 0.2);

    if (movement > threshold && movement > 6) {
      // Reveal if dragged far enough
      reveal();
    } else {
      // Spring back
      setDragState({
        isDragging: false,
        startY: 0,
        currentY: 0,
        pointerId: null
      });
    }
  };

  const handlePointerCancel = (e) => {
    if (e.pointerId === dragState.pointerId) {
      setDragState({
        isDragging: false,
        startY: 0,
        currentY: 0,
        pointerId: null
      });
    }
  };

  // State for name picker search
  const [nameFilter, setNameFilter] = useState('');

  // Global keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (stage === 'lock') {
        // Only on lock screen, no modal open
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp') {
          e.preventDefault();
          reveal();
        }
      } else if (stage === 'signin') {
        // Esc to go back to lock when modal is not open
        if (e.key === 'Escape' && !showStaffModal) {
          e.preventDefault();
          setStage('lock');
        } else if (e.key === 'Escape' && showStaffModal) {
          // Let existing modal handler close it
          handleCloseModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, showStaffModal]);

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
    setNameFilter('');
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
    setNameFilter('');
    setErrors({});
  };

  const handleStaffSelect = (staff) => {
    setSelectedStaff(staff);
    setPassword('');
    setErrors({});
    // Focus password field after selection
    setTimeout(() => {
      const passwordInput = document.querySelector('.modal-content input[type="password"]');
      if (passwordInput) passwordInput.focus();
    }, 100);
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

  const handleForgotPassword = async () => {
    // If no staff selected, show picker first
    if (!selectedStaff) {
      setShowStaffModal(true);
      setNameFilter('');
      fetchStaffList();
      return;
    }

    // Staff is selected, send request
    setForgotPasswordLoading(true);
    setErrors({});

    try {
      await axios.post('/api/auth/forgot-password', {
        userId: selectedStaff._id
      });
      setForgotPasswordSent(true);
      // Reset after 4 seconds
      setTimeout(() => {
        setForgotPasswordSent(false);
        setShowForgotPassword(false);
        setSelectedStaff(null);
      }, 4000);
    } catch (err) {
      if (err.response?.status === 429) {
        setErrors({ forgotPassword: 'Too many tries. Please wait a few minutes or see the administrator.' });
      } else {
        setErrors({ forgotPassword: err.response?.data?.message || 'Failed to send request. Try again.' });
      }
    } finally {
      setForgotPasswordLoading(false);
    }
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
  
  // Group staff by role
  const groupedStaff = () => {
    if (staffList.length <= 6) {
      // Flat list with roles shown
      return { flat: staffList.sort((a, b) => a.fullName.localeCompare(b.fullName)) };
    }
    
    // Group by role
    const roleOrder = ['Doctor', 'Nurse', 'Trainee Nurse', 'Midwife', 'Maintenance'];
    const groups = {};
    
    staffList.forEach(staff => {
      const role = staff.roleDisplay || 'Other';
      if (!groups[role]) groups[role] = [];
      groups[role].push(staff);
    });
    
    // Sort each group alphabetically
    Object.keys(groups).forEach(role => {
      groups[role].sort((a, b) => a.fullName.localeCompare(b.fullName));
    });
    
    // Order groups
    const orderedGroups = {};
    roleOrder.forEach(role => {
      if (groups[role]) orderedGroups[role] = groups[role];
    });
    
    // Add remaining roles
    Object.keys(groups).forEach(role => {
      if (!roleOrder.includes(role)) {
        orderedGroups[role] = groups[role];
      }
    });
    
    return orderedGroups;
  };
  
  // Filter staff by name
  const filteredStaff = () => {
    if (!nameFilter) return staffList;
    const lower = nameFilter.toLowerCase();
    return staffList.filter(staff => 
      staff.fullName.toLowerCase().includes(lower)
    );
  };

  return (
    <div className={`lock-screen ${stage === 'signin' ? 'lock-screen-signin' : ''}`}>
      <div className="lock-media" style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }} />
      <div className="lock-scrim" />

      {/* LOCK LAYER - Windows Style Lock Screen */}
      <div
        className={`lock-layer ${stage === 'signin' ? 'lock-layer-away' : ''}`}
        ref={lockLayerRef}
        role="region"
        aria-label="Lock screen"
        aria-hidden={stage === 'signin'}
        onDoubleClick={handleLockLayerDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={dragState.isDragging && dragState.currentY !== 0 ? {
          transform: `translateY(${dragState.currentY}px)`,
          opacity: 1 - Math.min(1, Math.abs(dragState.currentY) / (window.innerHeight * 0.6)),
          transition: 'none'
        } : {}}
      >
        {/* Brand bar */}
        <div className="lock-brandbar">
          <img src="/Icon.png" alt="" />
          <span>Tender Care Clinic</span>
        </div>

        {/* Center: time, date, button */}
        <div className="lock-stage-center">
          <div className="lock-big-time">{lockTime}</div>
          <div className="lock-big-date">{lockDate}</div>
          <button
            type="button"
            className="lock-open-btn"
            onClick={reveal}
            autoFocus
          >
            Sign in
          </button>
        </div>

        {/* Notices on the right */}
        {notices.length > 0 && (
          <aside className="lock-notices" aria-label="Staff notices">
            <h2 className="lock-notices-title">Staff notices</h2>
            <ul className="lock-notices-list">
              {notices.map(n => (
                <li key={n._id} className={`lock-notice lock-notice-${n.type}`}>
                  <div className="lock-notice-top">
                    <span>{NOTICE_LABELS[n.type]}</span>
                    <span>{formatNoticeDate(n.createdAt)}</span>
                  </div>
                  <div className="lock-notice-title">{n.title}</div>
                  <div className="lock-notice-body">{n.body}</div>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {/* SIGN-IN PAGE - Original content */}
      <div className={`lock-content ${stage === 'signin' ? 'visible' : ''}`} aria-hidden={stage === 'lock'}>
        <div className="lock-clock">
          <div className="lock-time">{timeString}</div>
          <div className="lock-date">{dateString}</div>
        </div>

        <div className="lock-wrapper">
          {/* Simple Sign In Card */}
          <div className="lock-card">
            <div className="lock-brand">
              <div className="lock-brand-icon">
                <img src="/Icon.png" alt="Tender Care Clinic" />
              </div>
              <div className="lock-brand-text">
                <div className="lock-brand-title">Tender Care Clinic</div>
                <div className="lock-brand-subtitle">Staff sign-in</div>
              </div>
            </div>

            {!showForgotPassword ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenStaffModal}
                  className="lock-submit"
                  disabled={isLoading}
                >
                  Sign in
                </button>

                <p className="lock-footnote">
                  Pick your name, then type your password.
                  <br />
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="link-button-secondary"
                    style={{ display: 'block', marginTop: '0.75rem', width: 'auto', marginLeft: 0 }}
                  >
                    Forgot password?
                  </button>
                </p>

                <button
                  type="button"
                  onClick={() => setStage('lock')}
                  className="link-button-secondary"
                  style={{ display: 'block', marginTop: '0.5rem', width: 'auto', marginLeft: 0 }}
                >
                  Back to lock screen
                </button>
              </>
            ) : (
              <>
                {!forgotPasswordSent ? (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
                        Pick your name
                      </p>
                      {selectedStaff && (
                        <div style={{
                          padding: '1rem',
                          background: '#f3f4f6',
                          borderRadius: '10px',
                          marginBottom: '1rem'
                        }}>
                          <p style={{ margin: '0.5rem 0', fontWeight: '600' }}>
                            {selectedStaff.fullName}
                          </p>
                          <p style={{ margin: '0', fontSize: '0.875rem', color: '#6b7280' }}>
                            {selectedStaff.roleDisplay}
                          </p>
                        </div>
                      )}
                      {errors.forgotPassword && (
                        <div className="lock-error" style={{ marginBottom: '1rem' }}>
                          {errors.forgotPassword}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="lock-submit"
                      disabled={forgotPasswordLoading || !selectedStaff}
                    >
                      {forgotPasswordLoading ? (
                        <>
                          <span className="lock-spinner" />
                          Sending...
                        </>
                      ) : (
                        'Send request'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setSelectedStaff(null);
                        setErrors({});
                      }}
                      className="link-button-secondary"
                      style={{ display: 'block', marginTop: '0.75rem', width: 'auto', marginLeft: 0 }}
                    >
                      Back to sign in
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                        Request sent.
                      </p>
                      <p style={{ fontSize: '0.9375rem', color: '#6b7280', margin: '0' }}>
                        Please see the administrator — they will give you a new password.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordSent(false);
                        setSelectedStaff(null);
                        setErrors({});
                      }}
                      className="lock-submit"
                      style={{ marginTop: '1.5rem' }}
                    >
                      Back to sign in
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Notices Section */}
          {notices.length > 0 && (
            <div className="login-notices">
              <h3 className="login-notices-title">Staff notices</h3>
              <div className="login-notices-list">
                {notices.map((notice) => (
                  <div key={notice._id} className={`login-notice login-notice-${notice.type}`}>
                    <div className="login-notice-header">
                      <span className="login-notice-badge">{NOTICE_LABELS[notice.type]}</span>
                      <span className="login-notice-date">{formatNoticeDate(notice.createdAt)}</span>
                    </div>
                    <h4 className="login-notice-title">{notice.title}</h4>
                    <p className="login-notice-body">{notice.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Staff Selection Modal */}
      {showStaffModal && (
        <div 
          className="modal-overlay" 
          onClick={handleCloseModal}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCloseModal();
          }}
        >
          <div 
            className={`modal-content ${selectedStaff ? 'modal-content-narrow' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
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
                    <h2>Who is signing in?</h2>
                    <p>Choose your name.</p>
                  </div>

                  {errors.general && (
                    <div className="lock-error">{errors.general}</div>
                  )}

                  {staffLoading ? (
                    <div className="staff-list-loading">Loading staff list...</div>
                  ) : (
                    <>
                      {/* Show search only if more than 8 staff */}
                      {staffList.length > 8 && (
                        <div className="staff-search-box">
                          <input
                            type="text"
                            className="staff-search-input"
                            placeholder="Type your name to find it"
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            autoFocus
                          />
                        </div>
                      )}

                      <div className="staff-picker-scroll">
                        {(() => {
                          const filtered = filteredStaff();
                          
                          if (filtered.length === 0) {
                            return <div className="staff-no-results">No one found. Check the spelling.</div>;
                          }
                          
                          const groups = groupedStaff();
                          
                          if (groups.flat) {
                            // Flat list (6 or fewer staff)
                            return (
                              <div className="staff-selection-list">
                                {groups.flat.map((staff) => (
                                  <button
                                    key={staff._id}
                                    className="staff-button"
                                    onClick={() => handleStaffSelect(staff)}
                                  >
                                    <div 
                                      className="staff-avatar-circle"
                                      style={{ backgroundColor: getAvatarColor(staff.fullName) }}
                                    >
                                      {getInitials(staff.fullName)}
                                    </div>
                                    <div className="staff-button-text">
                                      <div className="staff-button-name">{staff.fullName}</div>
                                      <div className="staff-button-role">{staff.roleDisplay}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            );
                          } else {
                            // Grouped list (more than 6 staff)
                            return (
                              <div className="staff-selection-grouped">
                                {Object.entries(groups).map(([role, members]) => (
                                  <div key={role} className="staff-group">
                                    <div className="staff-group-title">{role}s</div>
                                    <div className="staff-group-list">
                                      {members
                                        .filter(staff => 
                                          !nameFilter || 
                                          staff.fullName.toLowerCase().includes(nameFilter.toLowerCase())
                                        )
                                        .map((staff) => (
                                          <button
                                            key={staff._id}
                                            className="staff-button"
                                            onClick={() => handleStaffSelect(staff)}
                                          >
                                            <div 
                                              className="staff-avatar-circle"
                                              style={{ backgroundColor: getAvatarColor(staff.fullName) }}
                                            >
                                              {getInitials(staff.fullName)}
                                            </div>
                                            <div className="staff-button-text">
                                              <div className="staff-button-name">{staff.fullName}</div>
                                            </div>
                                          </button>
                                        ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                        })()}
                      </div>

                      <div className="modal-footer">
                        <button
                          type="button"
                          onClick={handleSwitchToUsername}
                          className="link-button"
                        >
                          Sign in with a username instead
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                // Password entry for selected staff
                <>
                  <div className="password-step-header">
                    <div 
                      className="staff-avatar-large"
                      style={{ backgroundColor: getAvatarColor(selectedStaff.fullName) }}
                    >
                      {getInitials(selectedStaff.fullName)}
                    </div>
                    <div className="password-step-info">
                      <div className="password-step-name">{selectedStaff.fullName}</div>
                      <div className="password-step-role">{selectedStaff.roleDisplay}</div>
                    </div>
                  </div>

                  <form onSubmit={handleStaffPasswordSubmit}>
                    {errors.general && (
                      <div className="lock-error-visible">{errors.general}</div>
                    )}

                    <div className="lock-field">
                      <div className="lock-password-group">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`lock-input ${errors.password ? 'error' : ''}`}
                          placeholder="Your password"
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
                        'Sign in'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleBackToStaffList}
                      className="link-button-secondary"
                    >
                      Choose a different name
                    </button>
                  </form>
                </>
              )
            ) : (
              // Username/Password Login
              <>
                <div className="modal-header">
                  <h2>Sign in with username</h2>
                  <p>For administrators and special accounts</p>
                </div>

                <form onSubmit={handleUsernameSubmit}>
                  {errors.general && (
                    <div className="lock-error-visible">{errors.general}</div>
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
                      'Sign in'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToStaffSelection}
                    className="link-button-secondary"
                  >
                    Back to staff selection
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
