import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen = true }) => {
  const location = useLocation();
  const { user } = useAuth();
  const isAdministrator = user?.accessLevel === 'ADMINISTRATOR';
  const canViewStaff = user?.accessLevel === 'ADMINISTRATOR' || user?.accessLevel === 'RECORDS_OPERATOR';

  return (
    <aside className={`sidebar ${!isOpen ? 'sidebar-hidden' : ''}`}>
      <nav className="sidebar-nav">
        <div className="nav-section">
          <p className="nav-section-title">Main</p>
          <ul className="nav-list">
            <li>
              <Link 
                to="/" 
                className={`nav-link ${location.pathname === '/' ? 'nav-link-active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                </svg>
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/patients" 
                className={`nav-link ${location.pathname === '/patients' ? 'nav-link-active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>Patient List</span>
              </Link>
            </li>
            {canViewStaff && (
              <li>
                <Link 
                  to="/staff" 
                  className={`nav-link ${location.pathname === '/staff' ? 'nav-link-active' : ''}`}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                  <span>Staff Directory</span>
                </Link>
              </li>
            )}
            <li>
              <Link 
                to="/schedule" 
                className={`nav-link ${location.pathname === '/schedule' ? 'nav-link-active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/>
                </svg>
                <span>Staff Schedule</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/add-patient" 
                className={`nav-link ${location.pathname === '/add-patient' ? 'nav-link-active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
                </svg>
                <span>New Patient</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="nav-section">
          <p className="nav-section-title">Management</p>
          <ul className="nav-list">
            {isAdministrator && (
              <li>
                <Link 
                  to="/payroll" 
                  className={`nav-link ${location.pathname.startsWith('/payroll') ? 'nav-link-active' : ''}`}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"/>
                  </svg>
                  <span>Payroll</span>
                </Link>
              </li>
            )}
            {isAdministrator && (
              <li>
                <Link 
                  to="/reports" 
                  className={`nav-link ${location.pathname === '/reports' ? 'nav-link-active' : ''}`}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z" />
                  </svg>
                  <span>Reports</span>
                </Link>
              </li>
            )}
            <li>
              <div className="nav-link nav-link-disabled">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"/>
                </svg>
                <span>Settings</span>
                <span className="nav-badge">Soon</span>
              </div>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;