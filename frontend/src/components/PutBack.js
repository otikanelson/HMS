import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PutBack.css';

const PutBack = () => {
  const [openVisits, setOpenVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [putting, setPutting] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadVisits();
    const interval = setInterval(() => {
      loadVisits();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadVisits = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/visits/open');
      setOpenVisits(response.data.visits || []);
    } catch (err) {
      console.error('Failed to load visits:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const onDeskVisits = openVisits.filter(v => v.stage === 'needs_recording');
  const stillOutVisits = openVisits.filter(v => v.stage !== 'needs_recording');

  // Group by location
  const groupByLocation = (visits) => {
    const groups = {};
    visits.forEach(visit => {
      const loc = visit.currentLocation || 'Unknown';
      if (!groups[loc]) {
        groups[loc] = [];
      }
      groups[loc].push(visit);
    });
    // Sort groups by location string (won't be perfect but reasonable)
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const handlePutAway = async (visitId) => {
    try {
      setPutting(visitId);
      setError('');

      const visit = openVisits.find(v => v._id === visitId);
      await axios.put(`/api/visits/${visitId}/record`, {});

      setSuccess(`Put away. File ${visit.patientId} goes back to ${visit.currentLocation}.`);
      await loadVisits();

      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to put away');
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

      await loadVisits();
      setSuccess(`Put away ${onDeskVisits.length} file${onDeskVisits.length !== 1 ? 's' : ''}`);

      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to put away files');
    } finally {
      setPutting(null);
    }
  };

  if (loading) {
    return (
      <div className="put-back">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const onDeskGroups = groupByLocation(onDeskVisits);
  const stillOutGroups = groupByLocation(stillOutVisits);

  return (
    <div className="put-back">
      <div className="put-back-header">
        <h1>Put back</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* On the desk section */}
      <div className="card">
        <div className="card-header">
          <h3>On the desk ({onDeskVisits.length})</h3>
        </div>
        <div className="card-body">
          {onDeskVisits.length === 0 ? (
            <p>None</p>
          ) : (
            <>
              {onDeskGroups.map(([location, visits]) => (
                <div key={location} style={{ marginBottom: 'var(--space-4)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 'var(--space-2)' }}>
                    {location}
                  </p>
                  {visits.sort((a, b) => parseInt(a.patientId) - parseInt(b.patientId)).map(visit => (
                    <div key={visit._id} className="put-back-row">
                      <div className="put-back-info">
                        <p className="put-back-name">{visit.patientName}</p>
                        <p className="put-back-number">Patient {visit.patientId}</p>
                      </div>
                      <button
                        onClick={() => handlePutAway(visit._id)}
                        disabled={putting !== null}
                        className="btn btn-primary btn-small"
                      >
                        {putting === visit._id ? 'Putting away...' : 'Put away'}
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              {onDeskVisits.length > 0 && (
                <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--gray-200)', marginTop: 'var(--space-4)' }}>
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={putting !== null}
                    className="btn btn-primary"
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
              )}
            </>
          )}
        </div>
      </div>

      {/* Still out section */}
      {stillOutVisits.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Still out ({stillOutVisits.length})</h3>
          </div>
          <div className="card-body">
            {stillOutGroups.map(([location, visits]) => (
              <div key={location} style={{ marginBottom: 'var(--space-4)' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 'var(--space-2)' }}>
                  {location}
                </p>
                {visits.sort((a, b) => parseInt(a.patientId) - parseInt(b.patientId)).map(visit => (
                  <div key={visit._id} className="put-back-row">
                    <div className="put-back-info">
                      <p className="put-back-name">{visit.patientName}</p>
                      <p className="put-back-number">Patient {visit.patientId}</p>
                      <span className={`stage-badge stage-badge-${visit.stage}`}>
                        {visit.stage === 'waiting_for_file' ? 'Finding file' : 'With doctor'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {onDeskVisits.length === 0 && stillOutVisits.length === 0 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <p style={{ fontSize: '1.125rem', color: 'var(--gray-600)' }}>Everything is put away. You can close for the day.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PutBack;
