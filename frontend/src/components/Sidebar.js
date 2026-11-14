import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Sidebar.css';

const Sidebar = ({ isOpen = true }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [openVisitsCount, setOpenVisitsCount] = useState(0);
  
  const isAdministrator = user?.accessLevel === 'ADMINISTRATOR';
  const isRecordsOperator = user?.accessLevel === 'RECORDS_OPERATOR';
  const canManageFiles = isAdministrator || isRecordsOperator;

  // Check if current path matches dashboard
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';
  
  // Check if on any patient page
  const isPatients = location.pathname === '/patients' || location.pathname.startsWith('/patients/');

  // Fetch open visits count
  useEffect(() => {
    const fetchOpenVisitsCount = async () => {
      try {
        const response = await axios.get('/api/visits/open');
        setOpenVisitsCount(response.data.total || 0);
      } catch (err) {
        console.error('Failed to fetch open visits count:', err);
      }
    };

    fetchOpenVisitsCount();

    // Refresh every 60 seconds
    const interval = setInterval(fetchOpenVisitsCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className={`sidebar ${!isOpen ? 'sidebar-hidden' : ''}`}>
      {isOpen && (
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {/* Group 1: Daily work */}
            <li>
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => `nav-link ${(isActive || isDashboard) ? 'nav-link-active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                </svg>
                <span>Home</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/file-desk" 
                className={({ isActive }) => `nav-link nav-link-file-desk ${isActive ? 'nav-link-active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                </svg>
                <span>File Desk</span>
                {openVisitsCount > 0 && <span className="badge">{openVisitsCount}</span>}
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/patients" 
                className={() => `nav-link ${isPatients ? 'nav-link-active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
                <span>Patients</span>
              </NavLink>
            </li>
            {canManageFiles && (
              <li>
                <NavLink 
                  to="/add-patient" 
                  className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd"/>
                  </svg>
                  <span>New Patient</span>
                </NavLink>
              </li>
            )}

            {/* Group 2: Planning */}
            <li className="nav-divider"></li>
            <li>
              <NavLink 
                to="/schedule" 
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/>
                </svg>
                <span>Schedule</span>
              </NavLink>
            </li>
            {canManageFiles && (
              <li>
                <NavLink 
                  to="/staff" 
                  className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                  <span>Staff</span>
                </NavLink>
              </li>
            )}

            {/* Group 3: Admin only */}
            {isAdministrator && (
              <>
                <li className="nav-divider"></li>
                <li>
                  <NavLink 
                    to="/payroll" 
                    className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                    </svg>
                    <span>Payroll</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/reports" 
                    className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                    </svg>
                    <span>Reports</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
      )}
    </aside>
  );
};

export default Sidebar;
