import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './FileDesk.css';

const STAGE_LABELS = {
  waiting_for_file: 'Finding file',
  with_doctor: 'With doctor',
  needs_recording: 'File back - needs recording',
  filed: 'Done - file back in cabinet'
};

const FileDesk = () => {
  const [patientNumber, setPatientNumber] = useState('');
  const [foundPatient, setFoundPatient] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);
  const [success, setSuccess] = useState('');
  const [conflictVisitId, setConflictVisitId] = useState(null);

  const [openVisits, setOpenVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [visitsError, setVisitsError] = useState('');

  const [fileBackingId, setFileBackingId] = useState(null);

  const numberInputRef = useRef(null);

  useEffect(() => {
    fetchOpenVisits();
  }, []);

  const fetchOpenVisits = async () => {
    try {
      setLoadingVisits(true);
      setVisitsError('');
      const response = await axios.get('/api/visits/open');
      setOpenVisits(response.data.visits || []);
    } catch (err) {
      console.error('Failed to fetch open visits:', err);
      setVisitsError('Failed to load visits');
    } finally {
      setLoadingVisits(false);
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
      setConflictVisitId(null);

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

  const handleStart = async () => {
    if (!foundPatient) return;

    try {
      setStarting(true);
      setSearchError('');
      setConflictVisitId(null);
      await axios.post('/api/visits/start', {
        patientId: foundPatient.patientId
      });
      
      setSuccess(`Visit started for ${foundPatient.fullName}.`);
      setFoundPatient(null);
      setPatientNumber('');
      await fetchOpenVisits();
      
      setTimeout(() => {
        setSuccess('');
        if (numberInputRef.current) {
          numberInputRef.current.focus();
        }
      }, 3000);
    } catch (err) {
      console.error('Start visit error:', err);
      if (err.response?.status === 409) {
        setSearchError(err.response.data.message);
        if (err.response.data.visitId) {
          setConflictVisitId(err.response.data.visitId);
        }
      } else {
        setSearchError(err.response?.data?.message || err.response?.data?.error || 'Failed to start visit');
      }
    } finally {
      setStarting(false);
    }
  };

  const handleClearPatient = () => {
    setFoundPatient(null);
    setSearchError('');
    setConflictVisitId(null);
    setPatientNumber('');
    if (numberInputRef.current) {
      numberInputRef.current.focus();
    }
  };

  const handleFileBack = async (visitId) => {
    if (!window.confirm('Is the paper file back in your hands?')) return;

    try {
      setFileBackingId(visitId);
      await axios.post(`/api/visits/${visitId}/file-back`);
      await fetchOpenVisits();
    } catch (err) {
      console.error('File back error:', err);
      setVisitsError(err.response?.data?.message || err.response?.data?.error || 'Failed to mark file as back');
      setTimeout(() => setVisitsError(''), 5000);
    } finally {
      setFileBackingId(null);
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

  const carriedOverCount = openVisits.filter(v => v.carriedOver).length;

  return (
    <div className="file-desk">
      <div className="file-desk-header">
        <div>
          <h2 className="file-desk-title">File Desk</h2>
          <p className="file-desk-subtitle">Start visits, check in patients, and track files</p>
        </div>
        <button onClick={fetchOpenVisits} className="btn btn-outline" disabled={loadingVisits}>
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
                setConflictVisitId(null);
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
            {conflictVisitId && (
              <div style={{ marginTop: 'var(--space-2)' }}>
                <Link to={`/visits/${conflictVisitId}`} className="link">Open that visit</Link>
              </div>
            )}
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
              </div>
              <button onClick={handleClearPatient} className="btn-clear">
                Not them
              </button>
            </div>
            <div className="found-patient-location">
              {foundPatient.locationDisplay}
            </div>
            <button 
              onClick={handleStart} 
              className="btn btn-primary btn-large"
              disabled={starting}
            >
              {starting ? 'Starting visit...' : 'This is them - start visit'}
            </button>
          </div>
        )}
      </div>

      <div className="file-desk-lists">
        {openVisits.length === 0 && !loadingVisits ? (
          <div className="list-banner list-banner-success">
            All patients are filed. You can close for the day.
          </div>
        ) : carriedOverCount > 0 ? (
          <div className="list-banner list-banner-error">
            {carriedOverCount} {carriedOverCount === 1 ? 'visit' : 'visits'} from before today are not filed.
          </div>
        ) : openVisits.length > 0 ? (
          <div className="list-banner list-banner-info">
            {openVisits.length} not filed yet.
          </div>
        ) : null}

        <div className="file-list-section">
          <h3 className="file-list-title">Patients not yet filed</h3>
          {visitsError && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
              {visitsError}
            </div>
          )}
          {loadingVisits ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading visits...</p>
            </div>
          ) : openVisits.length === 0 ? (
            <p className="empty-state">No visits in progress.</p>
          ) : (
            <div className="file-items">
              {openVisits.map((visit) => (
                <div key={visit._id} className={`file-item ${visit.carriedOver ? 'carried-over' : ''}`}>
                  {visit.carriedOver && (
                    <span className="carried-over-badge">
                      From {formatDate(visit.startedAt)} - not filed
                    </span>
                  )}
                  <div className="file-item-main">
                    <div className="file-item-info">
                      <h4 className="file-item-name">{visit.patientName}</h4>
                      <p className="file-item-number">Patient {visit.patientId}</p>
                      <p className="file-item-location">{visit.currentLocation}</p>
                    </div>
                    <div className="file-item-meta">
                      <span className="stage-chip stage-chip-{visit.stage}">
                        {STAGE_LABELS[visit.stage]}
                      </span>
                      <p className="file-item-time">
                        since {formatTime(visit.startedAt)}
                      </p>
                      <p className="file-item-user">
                        {visit.startedBy?.fullName || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="file-item-actions">
                    {visit.stage === 'waiting_for_file' && (
                      <Link to={`/visits/${visit._id}`} className="btn btn-primary">
                        Check-in
                      </Link>
                    )}
                    {visit.stage === 'with_doctor' && (
                      <button
                        onClick={() => handleFileBack(visit._id)}
                        className="btn btn-primary"
                        disabled={fileBackingId === visit._id}
                      >
                        {fileBackingId === visit._id ? 'Marking...' : 'File is back'}
                      </button>
                    )}
                    {visit.stage === 'needs_recording' && (
                      <Link to={`/visits/${visit._id}`} className="btn btn-primary">
                        Record and file
                      </Link>
                    )}
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
