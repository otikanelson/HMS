import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useOpenVisits } from '../context/OpenVisitsContext';
import './PutBackPanel.css';

const PutBackPanel = () => {
  const { visits, counts, refresh } = useOpenVisits();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [putting, setPutting] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('putBackPanelCollapsed');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    } catch (err) {
      console.warn('Failed to read collapsed state from localStorage:', err);
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      localStorage.setItem('putBackPanelCollapsed', newState.toString());
    } catch (err) {
      console.warn('Failed to save collapsed state to localStorage:', err);
    }
  };

  // Get visits that need recording (on the desk)
  const onDeskVisits = visits.filter(v => v.stage === 'needs_recording');

  // Group by location and sort
  const groupByLocation = (visitsToGroup) => {
    const groups = {};
    visitsToGroup.forEach(visit => {
      const loc = visit.currentLocation || 'Unknown';
      if (!groups[loc]) {
        groups[loc] = [];
      }
      groups[loc].push(visit);
    });
    
    // Sort groups by location string
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const onDeskGroups = groupByLocation(onDeskVisits);

  // Separate carried-over visits (from earlier day)
  const carriedOverGroups = onDeskGroups.map(([loc, visitsInLoc]) => [
    loc,
    visitsInLoc.filter(v => v.carriedOver),
    visitsInLoc.filter(v => !v.carriedOver)
  ]);

  const handlePutAway = async (visitId) => {
    try {
      setPutting(visitId);
      setError('');

      const visit = visits.find(v => v._id === visitId);
      await axios.put(`/api/visits/${visitId}/record`, {});

      setSuccessMessage(`Put away. File ${visit.patientId} goes back to ${visit.currentLocation}.`);
      
      // Refresh the context
      await refresh();

      // Auto-hide success after 8 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 8000);
    } catch (err) {
      console.error('Put away error:', err);
      setError(err.response?.data?.message || 'Failed to put away');
      setTimeout(() => setError(''), 5000);
    } finally {
      setPutting(null);
    }
  };

  const handlePutAwayAll = async () => {
    try {
      setPutting('all');
      setError('');
      setShowConfirm(false);

      await axios.post('/api/visits/put-away', {
        visitIds: onDeskVisits.map(v => v._id)
      });

      setSuccessMessage(`Put away ${onDeskVisits.length} file${onDeskVisits.length !== 1 ? 's' : ''}`);
      
      // Refresh the context
      await refresh();

      setTimeout(() => {
        setSuccessMessage('');
      }, 8000);
    } catch (err) {
      console.error('Put away all error:', err);
      setError(err.response?.data?.message || 'Failed to put away files');
      setTimeout(() => setError(''), 5000);
    } finally {
      setPutting(null);
    }
  };

  // Render collapsed tab
  if (isCollapsed) {
    return (
      <div className="put-back-panel put-back-panel-collapsed">
        <button
          onClick={toggleCollapsed}
          className="put-back-tab"
          title="Expand put back panel"
        >
          <span className="put-back-tab-text">Put back</span>
          {counts.desk > 0 && <span className="put-back-tab-count">{counts.desk}</span>}
        </button>
      </div>
    );
  }

  // Render expanded panel
  return (
    <div className="put-back-panel">
      <div className="put-back-panel-header">
        <h3>Put back {counts.desk > 0 && <span className="put-back-count">({counts.desk})</span>}</h3>
        <button
          onClick={toggleCollapsed}
          className="btn btn-link"
          style={{ fontSize: '0.875rem', padding: 0 }}
        >
          Hide
        </button>
      </div>

      {successMessage && (
        <div className="message message-success" style={{ marginBottom: 'var(--space-4)' }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div className="message message-error" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      <div className="put-back-panel-content">
        {onDeskVisits.length === 0 ? (
          <p className="put-back-empty">Nothing to put back.</p>
        ) : (
          <>
            {carriedOverGroups.map(([location, carriedOver, regular]) => {
              const toShow = [...carriedOver, ...regular];
              if (toShow.length === 0) return null;

              return (
                <div key={location} className="put-back-location-group">
                  <p className="put-back-location">{location}</p>
                  {toShow.sort((a, b) => parseInt(a.patientId) - parseInt(b.patientId)).map(visit => (
                    <div key={visit._id} className="put-back-row">
                      <div className="put-back-row-info">
                        <span className="put-back-row-number">{visit.patientId}</span>
                        <span className="put-back-row-name">{visit.patientName}</span>
                        {visit.carriedOver && (
                          <span className="stage-badge stage-badge-carried-over">Carried over</span>
                        )}
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
                </div>
              );
            })}

            {/* Show count of files still out */}
            {(counts.finding + counts.doctor) > 0 && (
              <p className="put-back-still-out">
                {counts.finding + counts.doctor} file{counts.finding + counts.doctor === 1 ? ' is' : 's are'}
                {counts.finding > 0 && counts.doctor > 0 ? ' with the doctor or being found' : counts.doctor > 0 ? ' with the doctor' : ' being found'}
              </p>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => setShowConfirm(true)}
        disabled={onDeskVisits.length === 0 || putting !== null}
        className="btn btn-secondary"
        style={{ width: '100%', marginTop: 'var(--space-4)' }}
      >
        Everything is back on the shelves
      </button>

      {showConfirm && (
        <div className="confirm-dialog">
          <div className="confirm-dialog-inner">
            <p><strong>This marks {onDeskVisits.length} file{onDeskVisits.length !== 1 ? 's' : ''} as put away.</strong></p>
            <p style={{ marginTop: 'var(--space-2)', color: 'var(--gray-600)' }}>Only do this after you have put them all back on the shelves.</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={putting !== null}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handlePutAwayAll}
                disabled={putting !== null}
                className="btn btn-primary"
              >
                {putting === 'all' ? 'Putting away...' : 'Put them away'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PutBackPanel;
