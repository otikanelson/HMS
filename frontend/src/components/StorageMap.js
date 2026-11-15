import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StorageMap.css';

const StorageMap = () => {
  const [ranges, setRanges] = useState([]);
  const [checkData, setCheckData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Find file card state
  const [lookupNumber, setLookupNumber] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  // New column state
  const [addingNew, setAddingNew] = useState(false);
  const [newValues, setNewValues] = useState({ section: '', tier: '', column: 'left', fromNumber: '', toNumber: '' });

  // Setup mode state
  const [setupMode, setSetupMode] = useState(false);
  const [setupValues, setSetupValues] = useState({ sections: 20, tiers: 3, filesPerColumn: 250, startNumber: 1 });
  const [setupGenerating, setSetupGenerating] = useState(false);

  // Load ranges and check data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const rangesRes = await axios.get('/api/storage-map');
      setRanges(rangesRes.data.ranges || []);

      const checkRes = await axios.get('/api/storage-map/check');
      setCheckData(checkRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load storage map');
      console.error('Load storage map error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupNumber.trim()) {
      setLookupResult(null);
      return;
    }

    try {
      const res = await axios.get(`/api/storage-map/lookup/${lookupNumber.trim()}`);
      setLookupResult(res.data);
    } catch (err) {
      setLookupResult({ number: lookupNumber, text: 'Error looking up file' });
    }
  };

  const handleEditStart = (range) => {
    setEditingId(range._id);
    setEditValues(range);
  };

  const handleEditSave = async () => {
    try {
      setSaving(true);
      setError('');

      await axios.put(`/api/storage-map/${editingId}`, {
        section: parseInt(editValues.section),
        tier: parseInt(editValues.tier),
        column: editValues.column,
        fromNumber: parseInt(editValues.fromNumber),
        toNumber: parseInt(editValues.toNumber)
      });

      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save range');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, fromNumber, toNumber) => {
    if (!window.confirm(`Delete this column? Files ${fromNumber} to ${toNumber} will show as 'Not in the storage map yet'.`)) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await axios.delete(`/api/storage-map/${id}`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete range');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = async () => {
    try {
      setSaving(true);
      setError('');

      await axios.post('/api/storage-map', {
        section: parseInt(newValues.section),
        tier: parseInt(newValues.tier),
        column: newValues.column,
        fromNumber: parseInt(newValues.fromNumber),
        toNumber: parseInt(newValues.toNumber)
      });

      setAddingNew(false);
      setNewValues({ section: '', tier: '', column: 'left', fromNumber: '', toNumber: '' });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add column');
    } finally {
      setSaving(false);
    }
  };

  const handleSetupGenerate = async () => {
    if (!window.confirm(`Creates ${setupValues.sections * setupValues.tiers * 2} columns for files ${setupValues.startNumber} to ${setupValues.startNumber + (setupValues.sections * setupValues.tiers * 2 * setupValues.filesPerColumn) - 1}.`)) {
      return;
    }

    try {
      setSetupGenerating(true);
      setError('');

      await axios.post('/api/storage-map/generate', {
        sections: parseInt(setupValues.sections),
        tiers: parseInt(setupValues.tiers),
        filesPerColumn: parseInt(setupValues.filesPerColumn),
        startNumber: parseInt(setupValues.startNumber)
      });

      setSetupMode(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate map');
    } finally {
      setSetupGenerating(false);
    }
  };

  const handleStartOver = async () => {
    if (!window.confirm('Delete all columns and start over? This cannot be undone.')) {
      return;
    }

    try {
      setSetupGenerating(true);
      setError('');

      // Delete all ranges
      for (const range of ranges) {
        await axios.delete(`/api/storage-map/${range._id}`);
      }

      setSetupMode(true);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clear map');
    } finally {
      setSetupGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="storage-map">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading storage map...</p>
        </div>
      </div>
    );
  }

  const isMapEmpty = ranges.length === 0;
  const isMapComplete = checkData && checkData.gaps.length === 0 && checkData.uncoveredPatients === 0;

  // Group ranges by section
  const rangesBySection = {};
  ranges.forEach(range => {
    if (!rangesBySection[range.section]) {
      rangesBySection[range.section] = [];
    }
    rangesBySection[range.section].push(range);
  });

  return (
    <div className="storage-map">
      <div className="storage-map-header">
        <h1>Storage Map</h1>
        <p className="storage-map-description">Tell the system where files are stored by numbering columns, tiers and sections.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Find file card */}
      <div className="card">
        <div className="card-header">
          <h3>Find a file</h3>
        </div>
        <div className="card-body">
          <div className="form-field">
            <label htmlFor="lookup">Patient number</label>
            <input
              id="lookup"
              type="number"
              value={lookupNumber}
              onChange={(e) => setLookupNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
              placeholder="e.g. 7 or 4521"
            />
          </div>
          {lookupResult && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <p>
                <strong>File {lookupResult.number} is in</strong><br />
                {lookupResult.text}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Check completeness card */}
      {!isMapEmpty && (
        <div className="card">
          <div className="card-header">
            <h3>Is the map complete?</h3>
          </div>
          <div className="card-body">
            {checkData && (
              <>
                {isMapComplete ? (
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--success-600)' }}>
                    ✓ Every file from 1 to 30,000 has a place.
                  </p>
                ) : (
                  <>
                    {checkData.gaps.length > 0 && (
                      <div>
                        <p style={{ marginBottom: 'var(--space-2)' }}><strong>Gaps:</strong></p>
                        {checkData.gaps.map((gap, i) => (
                          <p key={i} style={{ margin: 'var(--space-1) 0', fontSize: '0.95rem' }}>
                            Files {gap.from} to {gap.to} have no place yet
                          </p>
                        ))}
                      </div>
                    )}
                    {checkData.uncoveredPatients > 0 && (
                      <p style={{ marginTop: 'var(--space-3)' }}>
                        <strong>{checkData.uncoveredPatients} patient{checkData.uncoveredPatients !== 1 ? 's are' : ' is'}</strong> in no column.
                      </p>
                    )}
                    {checkData.gaps.length > 0 || checkData.uncoveredPatients > 0 ? (
                      <button onClick={() => setAddingNew(true)} className="btn btn-outline btn-small" style={{ marginTop: 'var(--space-3)' }}>
                        Add a column
                      </button>
                    ) : null}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Setup card (when empty) */}
      {isMapEmpty && !setupMode && (
        <div className="card">
          <div className="card-header">
            <h3>Set up the storage map</h3>
          </div>
          <div className="card-body">
            <button onClick={() => setSetupMode(true)} className="btn btn-primary">
              Create map
            </button>
          </div>
        </div>
      )}

      {/* Setup form (when empty and in setup mode) */}
      {setupMode && (
        <div className="card">
          <div className="card-header">
            <h3>Set up the storage map</h3>
          </div>
          <div className="card-body">
            <div className="form-field">
              <label htmlFor="setup-sections">Sections</label>
              <input
                id="setup-sections"
                type="number"
                value={setupValues.sections}
                onChange={(e) => setSetupValues({ ...setupValues, sections: parseInt(e.target.value) || 1 })}
                min="1"
                max="99"
              />
            </div>

            <div className="form-field">
              <label htmlFor="setup-tiers">Tiers in each section</label>
              <input
                id="setup-tiers"
                type="number"
                value={setupValues.tiers}
                onChange={(e) => setSetupValues({ ...setupValues, tiers: parseInt(e.target.value) || 1 })}
                min="1"
                max="10"
              />
            </div>

            <div className="form-field">
              <label htmlFor="setup-files">Files in each column</label>
              <input
                id="setup-files"
                type="number"
                value={setupValues.filesPerColumn}
                onChange={(e) => setSetupValues({ ...setupValues, filesPerColumn: parseInt(e.target.value) || 1 })}
                min="1"
                max="5000"
              />
            </div>

            <div className="form-field">
              <label htmlFor="setup-start">Start at file number</label>
              <input
                id="setup-start"
                type="number"
                value={setupValues.startNumber}
                onChange={(e) => setSetupValues({ ...setupValues, startNumber: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', margin: 'var(--space-3) 0' }}>
              Each tier has a left and a right column.
            </p>

            <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: 'var(--space-2) 0' }}>
              Creates {setupValues.sections * setupValues.tiers * 2} columns for files {setupValues.startNumber} to {setupValues.startNumber + (setupValues.sections * setupValues.tiers * 2 * setupValues.filesPerColumn) - 1}.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <button onClick={handleSetupGenerate} className="btn btn-primary" disabled={setupGenerating}>
                {setupGenerating ? 'Creating...' : 'Create map'}
              </button>
              {!isMapEmpty && (
                <button onClick={() => setSetupMode(false)} className="btn btn-outline" disabled={setupGenerating}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map table (when not empty) */}
      {!isMapEmpty && !setupMode && (
        <div className="card">
          <div className="card-header">
            <h3>Columns</h3>
          </div>
          <div className="card-body">
            {Object.keys(rangesBySection).sort((a, b) => parseInt(a) - parseInt(b)).map(section => (
              <div key={section} style={{ marginBottom: 'var(--space-4)' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 'var(--space-2)' }}>
                  Section {section}
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                        <th style={{ padding: 'var(--space-2)', textAlign: 'left', fontSize: '0.875rem' }}>Tier</th>
                        <th style={{ padding: 'var(--space-2)', textAlign: 'left', fontSize: '0.875rem' }}>Column</th>
                        <th style={{ padding: 'var(--space-2)', textAlign: 'left', fontSize: '0.875rem' }}>From</th>
                        <th style={{ padding: 'var(--space-2)', textAlign: 'left', fontSize: '0.875rem' }}>To</th>
                        <th style={{ padding: 'var(--space-2)', textAlign: 'left', fontSize: '0.875rem' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rangesBySection[section].map(range => (
                        <tr key={range._id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                          {editingId === range._id ? (
                            <>
                              <td style={{ padding: 'var(--space-2)' }}>
                                <input
                                  type="number"
                                  value={editValues.tier}
                                  onChange={(e) => setEditValues({ ...editValues, tier: parseInt(e.target.value) })}
                                  min="1"
                                  max="10"
                                  style={{ width: '60px' }}
                                />
                              </td>
                              <td style={{ padding: 'var(--space-2)' }}>
                                <select
                                  value={editValues.column}
                                  onChange={(e) => setEditValues({ ...editValues, column: e.target.value })}
                                  style={{ width: '100px' }}
                                >
                                  <option value="left">Left</option>
                                  <option value="right">Right</option>
                                </select>
                              </td>
                              <td style={{ padding: 'var(--space-2)' }}>
                                <input
                                  type="number"
                                  value={editValues.fromNumber}
                                  onChange={(e) => setEditValues({ ...editValues, fromNumber: parseInt(e.target.value) })}
                                  style={{ width: '80px' }}
                                />
                              </td>
                              <td style={{ padding: 'var(--space-2)' }}>
                                <input
                                  type="number"
                                  value={editValues.toNumber}
                                  onChange={(e) => setEditValues({ ...editValues, toNumber: parseInt(e.target.value) })}
                                  style={{ width: '80px' }}
                                />
                              </td>
                              <td style={{ padding: 'var(--space-2)' }}>
                                <button onClick={handleEditSave} className="btn btn-small btn-primary" disabled={saving}>
                                  Save
                                </button>
                                <button onClick={() => setEditingId(null)} className="btn btn-small btn-outline" disabled={saving} style={{ marginLeft: 'var(--space-1)' }}>
                                  Cancel
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: 'var(--space-2)' }}>{range.tier}</td>
                              <td style={{ padding: 'var(--space-2)' }}>{range.column === 'left' ? 'Left' : 'Right'}</td>
                              <td style={{ padding: 'var(--space-2)' }}>{range.fromNumber}</td>
                              <td style={{ padding: 'var(--space-2)' }}>{range.toNumber}</td>
                              <td style={{ padding: 'var(--space-2)' }}>
                                <button onClick={() => handleEditStart(range)} className="btn btn-small btn-outline" disabled={saving}>
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(range._id, range.fromNumber, range.toNumber)} className="btn btn-small btn-outline" disabled={saving} style={{ marginLeft: 'var(--space-1)' }}>
                                  Delete
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {addingNew && (
                        <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)' }}>
                          <td style={{ padding: 'var(--space-2)' }}>
                            <input
                              type="number"
                              value={newValues.tier}
                              onChange={(e) => setNewValues({ ...newValues, tier: parseInt(e.target.value) || '' })}
                              min="1"
                              max="10"
                              placeholder="Tier"
                              style={{ width: '60px' }}
                            />
                          </td>
                          <td style={{ padding: 'var(--space-2)' }}>
                            <select
                              value={newValues.column}
                              onChange={(e) => setNewValues({ ...newValues, column: e.target.value })}
                              style={{ width: '100px' }}
                            >
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </select>
                          </td>
                          <td style={{ padding: 'var(--space-2)' }}>
                            <input
                              type="number"
                              value={newValues.fromNumber}
                              onChange={(e) => setNewValues({ ...newValues, fromNumber: parseInt(e.target.value) || '' })}
                              placeholder="From"
                              style={{ width: '80px' }}
                            />
                          </td>
                          <td style={{ padding: 'var(--space-2)' }}>
                            <input
                              type="number"
                              value={newValues.toNumber}
                              onChange={(e) => setNewValues({ ...newValues, toNumber: parseInt(e.target.value) || '' })}
                              placeholder="To"
                              style={{ width: '80px' }}
                            />
                          </td>
                          <td style={{ padding: 'var(--space-2)' }}>
                            <button onClick={handleAddNew} className="btn btn-small btn-primary" disabled={saving}>
                              Save
                            </button>
                            <button onClick={() => setAddingNew(false)} className="btn btn-small btn-outline" disabled={saving} style={{ marginLeft: 'var(--space-1)' }}>
                              Cancel
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--gray-200)', display: 'flex', gap: 'var(--space-2)' }}>
              {!addingNew && (
                <button onClick={() => setAddingNew(true)} className="btn btn-outline">
                  Add a column
                </button>
              )}
              <button onClick={handleStartOver} className="btn btn-outline">
                Start again from scratch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageMap;
