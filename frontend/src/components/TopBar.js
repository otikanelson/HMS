import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOpenVisits } from '../context/OpenVisitsContext';
import axios from 'axios';
import Guide from './Guide';
import './TopBar.css';

const TopBar = ({ onToggleSidebar, onHelp, sidebarOpen }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPutBackMenu, setShowPutBackMenu] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { visits, counts, refresh } = useOpenVisits();

  const [putting, setPutting] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  const handlePutAway = async (visitId) => {
    try {
      setPutting(visitId);
      const visit = visits.find(v => v._id === visitId);
      await axios.put(`/api/visits/${visitId}/record`, {});
      setSuccessMessage(`Put away. File ${visit.patientId} goes back to ${visit.currentLocation}.`);
      await refresh();
      setTimeout(() => {
        setSuccessMessage('');
      }, 8000);
    } catch (err) {
      console.error('Put away error:', err);
    } finally {
      setPutting(null);
    }
  };

  const handlePutAwayAll = async () => {
    try {
      setPutting('all');
      setShowConfirm(false);
      const onDeskVisits = visits.filter(v => v.stage === 'needs_recording');
      await axios.post('/api/visits/put-away', {
        visitIds: onDeskVisits.map(v => v._id)
      });
      setSuccessMessage(`Put away ${onDeskVisits.length} file${onDeskVisits.length !== 1 ? 's' : ''}`);
      await refresh();
      setTimeout(() => {
        setSuccessMessage('');
      }, 8000);
    } catch (err) {
      console.error('Put away all error:', err);
    } finally {
      setPutting(null);
    }
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
          <form onSubmit={handleSearch} className="search-form" data-guide="top-search">
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

        {/* Right: Put Back + User menu + Help */}
        <div className="topbar-right">
          {user && (
            <>
              <div className="put-back-menu-container">
                <button 
                  onClick={() => setShowPutBackMenu(!showPutBackMenu)}
                  className="put-back-menu-btn"
                  title="Put back files"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fill="#000" d="M2 0h8l4 4v12H2V0zm7 1.5V5h3.5L9 1.5z"/>
                  </svg>
                  <span>Put back</span>
                  {counts.desk > 0 && <span className="put-back-badge">{counts.desk}</span>}
                  <svg className="put-back-dropdown-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M12.146 6.354l-.847-.847a.5.5 0 00-.708 0L8 9.172 4.409 5.507a.5.5 0 00-.708.708l3.5 3.5a.5.5 0 00.708 0l3.5-3.5a.5.5 0 000-.708zM8 12a.5.5 0 100-1 .5.5 0 000 1z" />
                  </svg>
                </button>
                
                {showPutBackMenu && (
                  <div className="put-back-menu-dropdown" data-guide="put-back-dropdown">
                    {successMessage && (
                      <div className="message message-success" style={{ margin: 'var(--space-2)' }}>
                        {successMessage}
                      </div>
                    )}
                    <div className="put-back-menu-content">
                      {counts.desk === 0 ? (
                        <p className="put-back-empty">Nothing to put back.</p>
                      ) : (
                        <>
                          {visits.filter(v => v.stage === 'needs_recording').map(visit => (
                            <div key={visit._id} className="put-back-menu-item">
                              <div className="put-back-item-info">
                                <span className="put-back-item-number">{visit.patientId}</span>
                                <span className="put-back-item-name">{visit.patientName}</span>
                              </div>
                              <button
                                onClick={() => handlePutAway(visit._id)}
                                disabled={putting !== null}
                                className="btn btn-primary btn-small"
                              >
                                Put away
                              </button>
                            </div>
                          ))}
                          
                          {(counts.finding + counts.doctor) > 0 && (
                            <p className="put-back-still-out">
                              {counts.finding + counts.doctor} file{counts.finding + counts.doctor === 1 ? ' is' : 's are'} still out
                            </p>
                          )}
                          
                          <button
                            onClick={() => setShowConfirm(true)}
                            disabled={counts.desk === 0 || putting !== null}
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: 'var(--space-2)' }}
                          >
                            Everything is back
                          </button>
                          
                          {showConfirm && (
                            <div className="put-back-confirm">
                              <p><strong>Mark all as put away?</strong></p>
                              <p>Only do this after you have put them all on the shelves.</p>
                              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                                <button
                                  onClick={() => setShowConfirm(false)}
                                  disabled={putting !== null}
                                  className="btn btn-outline"
                                  style={{ flex: 1 }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handlePutAwayAll}
                                  disabled={putting !== null}
                                  className="btn btn-primary"
                                  style={{ flex: 1 }}
                                >
                                  {putting === 'all' ? 'Putting...' : 'Put them away'}
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
                            
              <button 
                onClick={handleHelpClick} 
                className="help-btn"
                aria-label="Open the help guide"
                data-guide="help-button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="btn-label">Help</span>
              </button>
              <div className="user-menu-container">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="user-menu-btn"
                  title="User menu"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                  </svg>
                </button>
                
                {showUserMenu && (
                  <div className="user-menu-dropdown">
                    <div className="user-menu-header">
                      <div className="user-name">{user.fullName}</div>
                      <div className="user-role">
                        {user.accessLevel === 'ADMINISTRATOR' ? 'Administrator' : 
                         user.accessLevel === 'RECORDS_OPERATOR' ? 'Records Operator' : 
                         'Clinical Staff'}
                      </div>
                    </div>
                    <hr className="user-menu-divider" />
                    <button
                      onClick={handleLogout}
                      className="user-menu-signout"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M3 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H3zm10 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>

            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
