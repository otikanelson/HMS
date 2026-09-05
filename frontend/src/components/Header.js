import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../logo.png';
import './Header.css';

const Header = () => {
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <div className="brand-logo">
            <img src={logo} alt="Tender Care Logo" width="40" height="40" />
          </div>
          <div className="brand-text">
            <h1>Tender Care Medical Records</h1>
            <p>Patient File Management System</p>
          </div>
        </div>
        
        <nav className="header-nav">
          <Link 
            to="/" 
            className={`nav-item ${location.pathname === '/' ? 'nav-item-active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1L3 6v8a1 1 0 001 1h2V9h4v6h2a1 1 0 001-1V6L8 1z"/>
            </svg>
            Dashboard
          </Link>
          <Link 
            to="/search" 
            className={`nav-item ${location.pathname === '/search' ? 'nav-item-active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
            </svg>
            Search Files
          </Link>
          <Link 
            to="/add-patient" 
            className={`nav-item ${location.pathname === '/add-patient' ? 'nav-item-active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z"/>
            </svg>
            New Patient
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;