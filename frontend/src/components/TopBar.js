import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './TopBar.css';

const TopBar = () => {
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePatientSearch = (e) => {
    e.preventDefault();
    if (patientSearchQuery.trim()) {
      navigate(`/patients?search=${encodeURIComponent(patientSearchQuery.trim())}`);
    }
  };

  const handleStaffSearch = (e) => {
    e.preventDefault();
    if (staffSearchQuery.trim()) {
      navigate(`/staff?search=${encodeURIComponent(staffSearchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force navigation to login even if logout fails
      navigate('/login');
    }
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
    setShowNotificationDropdown(false); // Close other dropdown
  };

  const toggleNotificationDropdown = () => {
    setShowNotificationDropdown(!showNotificationDropdown);
    setShowProfileDropdown(false); // Close other dropdown
  };

  return (
    <header className="topbar">
      <div className="topbar-content">
        <div className="topbar-left">
          <button className="mobile-menu-btn">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
            </svg>
          </button>
          
          <div className="search-forms">
            <form onSubmit={handlePatientSearch} className="search-form">
              <div className="search-input-group">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="search-icon">
                  <path fillRule="evenodd" d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search patients by ID, name, or phone..."
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  className="search-input"
                />
                {patientSearchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setPatientSearchQuery('')}
                    className="search-clear"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <path d="M7 6.086L10.5 2.586a.5.5 0 11.707.708L7.707 6.793l3.5 3.5a.5.5 0 01-.707.708L7 7.501l-3.5 3.5a.5.5 0 01-.707-.708l3.5-3.5L2.793 3.293a.5.5 0 11.707-.708L7 6.086z"/>
                    </svg>
                  </button>
                )}
              </div>
            </form>

            <form onSubmit={handleStaffSearch} className="search-form">
              <div className="search-input-group">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="search-icon">
                  <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm2-3a2 2 0 11-4 0 2 2 0 014 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search staff by ID, name, or role..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  className="search-input"
                />
                {staffSearchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setStaffSearchQuery('')}
                    className="search-clear"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <path d="M7 6.086L10.5 2.586a.5.5 0 11.707.708L7.707 6.793l3.5 3.5a.5.5 0 01-.707.708L7 7.501l-3.5 3.5a.5.5 0 01-.707-.708l3.5-3.5L2.793 3.293a.5.5 0 11.707-.708L7 6.086z"/>
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="topbar-right">
          {/* Notifications Dropdown */}
          <div className="dropdown-container" ref={notificationDropdownRef}>
            <button 
              className="topbar-btn topbar-notification"
              onClick={toggleNotificationDropdown}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
              </svg>
              <span className="notification-dot"></span>
            </button>

            {showNotificationDropdown && (
              <div className="dropdown-menu notification-dropdown">
                <div className="dropdown-header">
                  <h3>Notifications</h3>
                </div>
                <div className="dropdown-content">
                  <div className="notification-empty">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="empty-icon">
                      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <path d="M24 16v8M24 28h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <p>No notifications yet</p>
                    <span>You'll see updates and alerts here</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="dropdown-container" ref={profileDropdownRef}>
            <button 
              className="topbar-user"
              onClick={toggleProfileDropdown}
            >
              <div className="topbar-user-avatar">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm2-3a2 2 0 11-4 0 2 2 0 014 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                </svg>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="dropdown-arrow">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>

            {showProfileDropdown && (
              <div className="dropdown-menu profile-dropdown">
                <div className="dropdown-header">
                  <div className="user-info">
                    <div className="user-avatar">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/>
                      </svg>
                    </div>
                    <div className="user-details">
                      <h4>{user?.fullName || 'User'}</h4>
                      <p>@{user?.username || 'username'}</p>
                    </div>
                  </div>
                </div>
                <div className="dropdown-content">
                  <button className="dropdown-item" onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M6 12.5a.5.5 0 00.5.5h8a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-8a.5.5 0 00-.5.5v2a.5.5 0 001 0V4h7v8H7v-1.5a.5.5 0 00-1 0v2z"/>
                      <path fillRule="evenodd" d="M.146 8.354a.5.5 0 010-.708l3-3a.5.5 0 11.708.708L1.707 7.5H10.5a.5.5 0 010 1H1.707l2.147 2.146a.5.5 0 01-.708.708l-3-3z"/>
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;