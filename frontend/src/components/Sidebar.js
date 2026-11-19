import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOpenVisits } from '../context/OpenVisitsContext';
import './Sidebar.css';

const Sidebar = ({ isOpen = true }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { counts } = useOpenVisits();

  const isAdministrator = user?.accessLevel === 'ADMINISTRATOR';
  const isRecordsOperator = user?.accessLevel === 'RECORDS_OPERATOR';
  const canManageFiles = isAdministrator || isRecordsOperator;

  // Check if current path matches dashboard
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  // Check if on any patient page
  const isPatients = location.pathname === '/patients' || location.pathname.startsWith('/patients/');

  return (
    <aside className={`sidebar ${!isOpen ? 'sidebar-hidden' : ''}`}>
      {isOpen && (
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {/* Group 1: Daily work - ordered by frequency */}
            <li>
              <NavLink
                to="/visit"
                className={({ isActive }) => `nav-link nav-link-visit ${isActive ? 'nav-link-active' : ''}`}
                data-guide="side-visit"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                <span>Visit</span>
                {(counts.finding + counts.doctor) > 0 && <span className="badge">{counts.finding + counts.doctor}</span>}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/patients"
                className={() => `nav-link ${isPatients ? 'nav-link-active' : ''}`}
                data-guide="side-patients"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span>Patients</span>
              </NavLink>
            </li>
            {canManageFiles && (
              <li>
                <NavLink
                  to="/add-patient"
                  className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                  data-guide="side-new-patient"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                  </svg>
                  <span>New Patient</span>
                </NavLink>
              </li>
            )}

            {/* Group 2: Planning & Management */}
            <li className="nav-divider"></li>
            <li>
              <NavLink
                to="/staff"
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                data-guide="side-staff"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span>Staff</span>
              </NavLink>
            </li>
            {canManageFiles && (
              <li>
                <NavLink
                  to="/schedule"
                  className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                  data-guide="side-schedule"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" />
                  </svg>
                  <span>Schedule</span>
                </NavLink>
              </li>
            )}
            <li>
              <NavLink
                to="/inventory"
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                data-guide="side-inventory"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 3a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a2 2 0 001.789-2.894l-1.447-3.894A2 2 0 0011.553 3H4z" />
                  <path d="M7 16a2 2 0 11-4 0 2 2 0 014 0zM16 16a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Drugs & Supplies</span>
              </NavLink>
            </li>

            {/* Group 3: System Admin only */}
            {isAdministrator && (
              <>
                <li className="nav-divider"></li>
                <li>
                  <NavLink
                    to="/storage-map"
                    className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                    data-guide="side-storage-map"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h1a1 1 0 001-1v-6a1 1 0 00-1-1h-1z" />
                    </svg>
                    <span>Storage map</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/payroll"
                    className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                    data-guide="side-payroll"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                    </svg>
                    <span>Payroll</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/reports"
                    className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                    data-guide="side-reports"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    <span>Reports</span>
                  </NavLink>
                </li>
              </>
            )}

            {/* Group 4: Quick access to home */}
            <li className="nav-divider"></li>
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `nav-link ${(isActive || isDashboard) ? 'nav-link-active' : ''}`}
                data-guide="sidebar-home"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span>Home</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      )}
    </aside>
  );
};

export default Sidebar;
