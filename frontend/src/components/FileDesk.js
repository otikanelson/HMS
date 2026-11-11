import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './FileDesk.css';

const FileDesk = () => {
  const [patientNumber, setPatientNumber] = useState('');
  const [foundPatient, setFoundPatient] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [success, setSuccess] = useState('');

  const [openFiles, setOpenFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [filesError, setFilesError] = useState('');

  const [returningId, setReturningId] = useState(null);
  const [showReturnConfirm, setShowReturnConfirm] = useState(null);

  const numberInputRef = useRef(null);
  const refreshInterval = useRef(null);

  useEffect(() => {
    fetchOpenFiles();
    refreshInterval.current = setInterval(fetchOpenFiles, 60000);
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  const fetchOpenFiles = async () => {
    try {
      setLoadingFiles(true);
      setFilesError('');
      const response = await axios.get('/api/visits/open');
      setOpenFiles(response.data.visits || []);
    } catch (err) {
      console.error('Failed to fetch open files:', err);
      setFilesError('Failed to load open files');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!patientNumber.trim()) return;

    try {
      setSearching(true);
      setSearchError('');
      setSuccess('');
      setFoundPatient(null);

      const response = await axios.get(`/api/patients/${patientNumber.trim()}`);
      setFoundPatient(response.data);
    } catch (err) {
      console.error('Patient search error:', err);
      if (err.response?.status === 404) {
        setSearchError('No patient with that number. Check the number, or add the patient first.');
      } else {
        setSearchError(err.response?.data?.message || err.response?.data?.error || 'Search failed');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleCheckout = async () => {
    if (!foundPatient) return;

    try {
      setCheckingOut(true);
      setSearchError('');
      const response = await axios.post('/api/visits/checkout', {
        patientId: foundPatient.patientId
      });
      
      setSuccess(`File taken out for ${foundPatient.fullName}`);
      setFoundPatient(null);
      setPatientNumber('');
      await fetchOpenFiles();
      
      setTimeout(() => {
        setSuccess('');
        if (numberInputRef.current) {
          numberInputRef.current.focus();
        }
      }, 3000);
    } catch (err) {
      console.error('Checkout error:', err);
      if (err.response?.status === 409) {
        setSearchError(err.response.data.message);
      } else {
        setSearchError(err.response?.data?.message || err.response?.data?.error || 'Checkout failed');
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const handleMarkReturned = async (visitId) => {
    try {
      setReturningId(visitId);
      await axios.put(`/api/visits/${visitId}/return`);
      setShowReturnConfirm(visitId);
      await fetchOpenFiles();
    } catch (err) {
      console.error('Return error:', err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to mark file as returned');
      setReturningId(null);
    }
  };

  const handleClearPatient = () => {
    setFoundPatient(null);
    setSearchError('');
    setPatientNumber('');
    if (numberInputRef.current) {
      numberInputRef.current.focus();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const lagosOptions = { timeZone: 'Africa/Lagos', month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', lagosOptions);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const lagosOptions = { 
      timeZone: 'Africa/Lagos', 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleTimeString('en-US', lagosOptions);
  };

  const formatPhone = (phoneNumber) => {
    if (!phoneNumber) return '';
    const lastFour = phoneNumber.slice(-4);
    return `ends in ${lastFour}`;
  };

  const outFiles = openFiles.filter(v => v.fileStatus === 'out');
  const backFiles = openFiles.filter(v => v.fileStatus === 'returned' && v.documentationStatus === 'pending');

  return (
    <div className="file-desk">
      <div className="file-desk-header">
        <div>
          <h2 className="file-desk-title">File Desk</h2>
          <p className="file-desk-subtitle">Check out patient files and track returns</p>
        </div>
        <button onClick={fetchOpenFiles} className="btn btn-outline" disabled={loadingFiles}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 3a5 5 0 104.546 2.914.5.5 0 01.908-.417A6 6 0 118 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 01.41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 018 4.466z"/>
          </svg>
          Refresh
        </button>
      </div>

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="file-desk-search-card">
        <form onSubmit={handleSearch}>
          <div className="search-input-row">
            <input
              ref={numberInputRef}
              type="text"
              value={patientNumber}
              onChange={(e) => {
                setPatientNumber(e.target.value);
                setSearchError('');
              }}
              placeholder="Patient number"
              className="search-input"
              autoFocus
              disabled={searching}
            />
            <button type="submit" className="btn btn-primary" disabled={searching || !patientNumber.trim()}>
              {searching ? 'Searching...' : 'Find'}
            </button>
          </div>
        </form>

        {searchError && (
          <div className="alert alert-error" style={{ marginTop: 'var(--space-4)' }}>
            {searchError}
            {searchError.includes('Check the number') && (
              <div style={{ marginTop: 'var(--space-2)' }}>
                <Link to="/add-patient" className="link">Add a new patient</Link>
              </div>
            )}
          </div>
        )}

        {foundPatient && (
          <div className="found-patient-card">
            <div className="found-patient-header">
              <div>
                <h3 className="found-patient-name">{foundPatient.fullName}</h3>
                <p className="found-patient-phone">{formatPhone(foundPatient.phoneNumber)}</p>
                <p className="found-patient-status">Status: {foundPatient.status}</p>
              </div>
              <button onClick={handleClearPatient} className="btn-clear">
                Not them
              </button>
            </div>
            <div className="found-patient-location">
              {foundPatient.locationDisplay}
            </div>
            <button 
              onClick={handleCheckout} 
              className="btn btn-primary btn-large"
              disabled={checkingOut}
            >
              {checkingOut ? 'Taking out...' : 'Take this file out'}
            </button>
          </div>
        )}
      </div>

      <div className="file-desk-lists">
        <div className="file-list-section">
          <h3 className="file-list-title">Files out right now</h3>
          {loadingFiles ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading files...</p>
            </div>
          ) : filesError ? (
            <div className="alert alert-error">{filesError}</div>
          ) : outFiles.length === 0 ? (
            <p className="empty-state">No files are out right now.</p>
          ) : (
            <div className="file-items">
              {outFiles.map((visit) => (
                <div key={visit._id} className={`file-item ${visit.carriedOver ? 'carried-over' : ''}`}>
                  {visit.carriedOver && (
                    <span className="carried-over-badge">
                      Still out from {formatDate(visit.checkedOutAt)}
                    </span>
                  )}
                  <div className="file-item-main">
                    <div className="file-item-info">
                      <h4 className="file-item-name">{visit.patientName}</h4>
                      <p className="file-item-number">Patient {visit.patientId}</p>
                      <p className="file-item-location">{visit.fileLocation}</p>
                    </div>
                    <div className="file-item-meta">
                      <p className="file-item-time">
                        {formatTime(visit.checkedOutAt)}
                      </p>
                      <p className="file-item-user">
                        {visit.checkedOutBy?.fullName || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="file-item-actions">
                    {showReturnConfirm === visit._id ? (
                      <div className="return-confirm-actions">
                        <Link 
                          to={`/visits/${visit._id}`}
                          className="btn btn-primary btn-small"
                        >
                          Enter details now
                        </Link>
                        <button
                          onClick={() => setShowReturnConfirm(null)}
                          className="btn btn-outline btn-small"
                        >
                          Do it later
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (window.confirm('Is the paper file back in your hands?')) {
                            handleMarkReturned(visit._id);
                          }
                        }}
                        className="btn btn-outline"
                        disabled={returningId === visit._id}
                      >
                        {returningId === visit._id ? 'Marking...' : 'Mark returned'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="file-list-section">
          <h3 className="file-list-title">Back on the desk - details not entered yet</h3>
          {loadingFiles ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading files...</p>
            </div>
          ) : filesError ? (
            <div className="alert alert-error">{filesError}</div>
          ) : backFiles.length === 0 ? (
            <p className="empty-state">All returned files have been documented.</p>
          ) : (
            <div className="file-items">
              {backFiles.map((visit) => (
                <div key={visit._id} className={`file-item ${visit.carriedOver ? 'carried-over' : ''}`}>
                  {visit.carriedOver && (
                    <span className="carried-over-badge">
                      Still not documented from {formatDate(visit.checkedOutAt)}
                    </span>
                  )}
                  <div className="file-item-main">
                    <div className="file-item-info">
                      <h4 className="file-item-name">{visit.patientName}</h4>
                      <p className="file-item-number">Patient {visit.patientId}</p>
                      <p className="file-item-location">{visit.fileLocation}</p>
                    </div>
                    <div className="file-item-meta">
                      <p className="file-item-time">
                        Returned {formatTime(visit.returnedAt)}
                      </p>
                      <p className="file-item-user">
                        {visit.returnedBy?.fullName || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="file-item-actions">
                    <Link
                      to={`/visits/${visit._id}`}
                      className="btn btn-primary"
                    >
                      Enter details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileDesk;
