import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="currentColor"/>
            <path d="M16 8v16M8 16h16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div className="sidebar-brand">
            <h2>De Tender Care</h2>
            <p>File Management</p>
          </div>
        </div>
      </div>

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
            <li>
              <div className="nav-link nav-link-disabled">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>Reports</span>
                <span className="nav-badge">Soon</span>
              </div>
            </li>
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