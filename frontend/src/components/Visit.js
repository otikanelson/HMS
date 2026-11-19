import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useOpenVisits } from '../context/OpenVisitsContext';
import './Visit.css';

const Visit = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { visits: contextVisits, lastUpdated, refresh } = useOpenVisits();

  const [patientNumber, setPatientNumber] = useState('');
  const [foundPatient, setFoundPatient] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);
  const [success, setSuccess] = useState('');
  const [conflictVisitId, setConflictVisitId] = useState(null);

  const [fileBackingId, setFileBackingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [steppingBackId, setSteppingBackId] = useState(null);

  const numberInputRef = useRef(null);

  useEffect(() => {
    // Auto-fill patient ID from query parameter if present
    const patientIdParam = searchParams.get('patientId');
    if (patientIdParam) {
      setPatientNumber(patientIdParam);
    }
  }, [searchParams]);

  // Auto-search when patient number is populated from query parameter
  useEffect(() => {
    if (patientNumber && !foundPatient && !searching) {
      const patientIdParam = searchParams.get('patientId');
      if (patientIdParam && patientIdParam === patientNumber) {
        // Trigger auto-search
        performSearch(patientNumber);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientNumber]);

  const performSearch = async (patientNum) => {
    if (!patientNum.trim()) return;

    try {
      setSearching(true);
      setSearchError('');
      setSuccess('');
      setFoundPatient(null);
      setConflictVisitId(null);

      const response = await axios.get(`/api/patients/${patientNum.trim()}`);
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

  const handleSearch = async (e) => {
    e.preventDefault();
    performSearch(patientNumber);
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
      await refresh();

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
      await refresh();
      // Navigate to the visit details page to record the doctor's report
      navigate(`/visits/${visitId}`);
    } catch (err) {
      console.error('File back error:', err);
    } finally {
      setFileBackingId(null);
    }
  };

  const handleCancelVisit = async (visitId) => {
    if (!window.confirm('Cancel this visit? It will be marked as started by mistake.')) return;

    try {
      setCancellingId(visitId);
      await axios.post(`/api/visits/${visitId}/cancel`);
      await refresh();
    } catch (err) {
      console.error('Cancel visit error:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const handleStepBackVisit = async (visitId) => {
    if (!window.confirm('Move this visit back one step?')) return;

    try {
      setSteppingBackId(visitId);
      await axios.post(`/api/visits/${visitId}/step-back`);
      await refresh();
    } catch (err) {
      console.error('Step back error:', err);
    } finally {
      setSteppingBackId(null);
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

  const carriedOverCount = contextVisits.filter(v => v.carriedOver).length;

  return (
    <div className="visit">
      <div className="visit-header">
        <div>
          <h2 className="visit-title">Visit</h2>
          <p className="visit-subtitle">Start visits, check in patients, and track files</p>
        </div>
        <button onClick={refresh} className="btn btn-outline">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 3a5 5 0 104.546 2.914.5.5 0 01.908-.417A6 6 0 118 2v1z" />
            <path d="M8 4.466V.534a.25.25 0 01.41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 018 4.466z" />
          </svg>
          Refresh
        </button>
      </div>

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="visit-search-card" data-guide="desk-number">
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
                <h3 className="found-patient-name">
                  {foundPatient.fullName}
                  {foundPatient.patientType === 'antenatal' && <span style={{ marginLeft: '8px', fontSize: '0.75rem', fontWeight: '600', background: 'var(--primary-100)', color: 'var(--primary-700)', padding: '2px 6px', borderRadius: '3px', display: 'inline-block' }}>Antenatal</span>}
                </h3>
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

      <div className="visit-lists" data-guide="desk-columns">
        {contextVisits.length === 0 ? (
          <div className="list-banner list-banner-success">
            All patients are filed. You can close for the day.
          </div>
        ) : carriedOverCount > 0 ? (
          <div className="list-banner list-banner-error">
            {carriedOverCount} {carriedOverCount === 1 ? 'visit' : 'visits'} from before today are not filed.
          </div>
        ) : contextVisits.length > 0 ? (
          <div className="list-banner list-banner-info">
            {contextVisits.length} not filed yet. <span style={{ fontWeight: 500 }}>Updated {lastUpdated?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) || 'now'}</span>
          </div>
        ) : null}

        {contextVisits.length === 0 ? (
          <p className="empty-state">No visits in progress.</p>
        ) : (
          <div className="visit-columns">
            {/* Column 1: Finding file stage */}
            <div className="visit-column" data-guide="desk-finding">
              <div className="visit-column-header">
                <h3>Finding file</h3>
                <span className="visit-column-count">{contextVisits.filter(v => v.stage === 'waiting_for_file').length}</span>
              </div>
              <div className="visit-items">
                {contextVisits.filter(v => v.stage === 'waiting_for_file').map((visit) => (
                  <div key={visit._id} className={`visit-item ${visit.carriedOver ? 'carried-over' : ''}`}>
                    {visit.carriedOver && (
                      <span className="carried-over-badge">
                        From {formatDate(visit.startedAt)} - not filed
                      </span>
                    )}
                    <div className="visit-item-main">
                      <div className="visit-item-header">
                        <div>
                          <h4 className="visit-item-name">{visit.patientName}</h4>
                          <p className="visit-item-number">Patient {visit.patientId}</p>
                        </div>
                      </div>
                      <p className="visit-item-location">Located: {visit.currentLocation}</p>
                      <p className="visit-item-meta">
                        Since {formatTime(visit.startedAt)} by {visit.startedBy?.fullName || 'Unknown'}
                      </p>
                    </div>
                    <div className="visit-item-action">
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <Link
                          to={`/visits/${visit._id}`}
                          className="btn btn-primary"
                        >
                          Check-in
                        </Link>
                        <button
                          onClick={() => handleCancelVisit(visit._id)}
                          className="btn btn-outline"
                          disabled={cancellingId === visit._id}
                        >
                          {cancellingId === visit._id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {contextVisits.filter(v => v.stage === 'waiting_for_file').length === 0 && (
                  <p className="empty-state">None</p>
                )}
              </div>
            </div>

            {/* Column 2: With doctor stage */}
            <div className="visit-column" data-guide="desk-doctor">
              <div className="visit-column-header">
                <h3>With doctor</h3>
                <span className="visit-column-count">{contextVisits.filter(v => v.stage === 'with_doctor').length}</span>
              </div>
              <div className="visit-items">
                {contextVisits.filter(v => v.stage === 'with_doctor').map((visit) => (
                  <div key={visit._id} className={`visit-item ${visit.carriedOver ? 'carried-over' : ''}`}>
                    {visit.carriedOver && (
                      <span className="carried-over-badge">
                        From {formatDate(visit.startedAt)} - not filed
                      </span>
                    )}
                    <div className="visit-item-main">
                      <div className="visit-item-header">
                        <div>
                          <h4 className="visit-item-name">{visit.patientName}</h4>
                          <p className="visit-item-number">Patient {visit.displayNumber || visit.patientId}</p>
                        </div>
                      </div>
                    </div>
                    <div className="visit-item-action">
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleFileBack(visit._id)}
                          className="btn btn-primary"
                          disabled={fileBackingId === visit._id}
                        >
                          {fileBackingId === visit._id ? 'Marking...' : 'File is back'}
                        </button>
                        <button
                          onClick={() => handleStepBackVisit(visit._id)}
                          className="btn btn-outline"
                          disabled={steppingBackId === visit._id}
                        >
                          {steppingBackId === visit._id ? 'Going back...' : 'Go back'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {contextVisits.filter(v => v.stage === 'with_doctor').length === 0 && (
                  <p className="empty-state">None</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Visit;
