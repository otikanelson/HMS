import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Guide from './Guide';
import './TopBar.css';

const TopBar = ({ onToggleSidebar, onHelp, sidebarOpen }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/patients?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  const handleHelpClick = () => {
    setShowGuide(true);
  };

  const handleGuideComplete = async () => {
    setShowGuide(false);
    // Update backend that user has seen the guide
    try {
      await axios.put('/api/profile', { hasSeenGuide: true });
    } catch (err) {
      console.error('Failed to update guide status:', err);
    }
  };

  return (
    <header className="topbar">
      {showGuide && user && (
        <Guide 
          user={user} 
          onClose={() => setShowGuide(false)}
          onComplete={handleGuideComplete}
        />
      )}
      <div className="topbar-content">
        {/* Left: Menu button/Icon + Brand */}
        <div className="topbar-left">
          <button className="menu-btn" onClick={onToggleSidebar}>
            {sidebarOpen ? (
              <img src="/Icon.png" alt="Tender Care" className="menu-icon" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
              </svg>
            )}
          </button>

          <div className="brand">
            <span className="brand-name">Tender Care</span>
          </div>
        </div>

        {/* Center: Search */}
        <div className="topbar-center">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search patient ID, name or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
              </svg>
            </button>
          </form>
        </div>

        {/* Right: User info + Help + Sign out */}
        <div className="topbar-right">
          {user && (
            <>
              <span className="user-info">
                {user.fullName} · {user.accessLevel === 'ADMINISTRATOR' ? 'Administrator' : 
                                   user.accessLevel === 'RECORDS_OPERATOR' ? 'Records Operator' : 
                                   'Clinical Staff'}
              </span>
              <button onClick={handleHelpClick} className="help-btn" title="Help guide">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16z"/>
                  <path d="M5.893 6.5c.129-.697.662-1.283 1.38-1.53.72-.248 1.548-.17 2.163.287.617.456.92 1.188.92 1.993 0 .667-.337 1.252-.914 1.586-.577.335-1.287.335-1.865 0"/>
                  <path d="M8 11a1 1 0 110 2 1 1 0 010-2z"/>
                </svg>
                <span className="btn-label">Help</span>
              </button>
              <button onClick={handleLogout} className="signout-btn" title="Sign out">
                <span className="btn-label">Sign out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
