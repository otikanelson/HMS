import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { PatientStatusBadge } from './PatientStatusControl';
import PatientStatusControl from './PatientStatusControl';
import PatientStatusFilter from './PatientStatusFilter';
import './PatientList.css';

const PatientList = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [editedPatients, setEditedPatients] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const fetchPatients = useCallback(async (page = 1, reset = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');
      
      const searchQuery = searchParams.get('search');
      const archivedParam = includeArchived ? '&includeArchived=true' : '';
      let url = `/api/patients?page=${page}&limit=20${archivedParam}`;
      
      if (searchQuery) {
        // For search queries, load all results at once (no pagination)
        url = `/api/patients/search?q=${encodeURIComponent(searchQuery)}${archivedParam}`;
      }
      
      const response = await axios.get(url);
      
      if (searchQuery) {
        // Search results - no pagination, show all results
        setPatients(response.data.patients || []);
        setTotalRecords(response.data.total || 0);
        setHasMore(false);
        setCurrentPage(1);
      } else {
        // Regular pagination with lazy loading
        const newPatients = response.data.patients || [];
        const pagination = response.data.pagination || {};
        
        if (reset || page === 1) {
          setPatients(newPatients);
        } else {
          setPatients(prev => [...prev, ...newPatients]);
        }
        
        setTotalRecords(pagination.totalRecords || 0);
        setHasMore(pagination.current < pagination.total);
        setCurrentPage(pagination.current);
      }
    } catch (err) {
      setError('Failed to load patient list');
      console.error('Patient list error:', err);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchParams, includeArchived]);

  useEffect(() => {
    // Reset state when search params or includeArchived changes
    setPatients([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchPatients(1, true);
  }, [fetchPatients, includeArchived]);

  const loadMorePatients = () => {
    if (!loadingMore && hasMore && !searchParams.get('search')) {
      fetchPatients(currentPage + 1, false);
    }
  };

  const handleLocationUpdate = (patientId, field, value) => {
    // Update the patient in the state immediately
    setPatients(prevPatients => 
      prevPatients.map(patient => 
        patient.patientId === patientId 
          ? { ...patient, [field]: value }
          : patient
      )
    );
    
    // Track edited patients for saving
    setEditedPatients(prev => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        [field]: value
      }
    }));
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      // Save any pending changes when exiting edit mode
      Object.keys(editedPatients).forEach(patientId => {
        saveLocationIfChanged(patientId);
      });
    }
    setIsEditMode(!isEditMode);
  };

  const saveLocationIfChanged = async (patientId) => {
    const edits = editedPatients[patientId];
    if (!edits) return;

    try {
      await axios.put(`/api/patients/${patientId}/location`, edits);
      
      // Clear the edit tracking for this patient
      setEditedPatients(prev => {
        const newEdited = { ...prev };
        delete newEdited[patientId];
        return newEdited;
      });
      
    } catch (error) {
      setError('Failed to update location');
      console.error('Update location error:', error);
      
      // Revert the changes in UI
      fetchPatients(1, true);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRefresh = () => {
    setPatients([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchPatients(1, true);
  };

  const handlePatientStatusChanged = (patientId, updatedPatient) => {
    setPatients(prev => 
      prev.map(p => p.patientId === patientId ? { ...p, ...updatedPatient } : p)
    );
  };

  const handlePatientDeleted = (patientId) => {
    setPatients(prev => prev.filter(p => p.patientId !== patientId));
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(patientId);
      return newSet;
    });
  };

  const handleQuickStatusChange = async (patientId, newStatus) => {
    try {
      const response = await axios.put(`/api/patients/${patientId}/status`, { status: newStatus });
      // Update patient in list with new status
      handlePatientStatusChanged(patientId, response.data.patient);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to update patient status');
      // Scroll to error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="patient-list">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading patient list...</p>
        </div>
      </div>
    );
  }

  const searchQuery = searchParams.get('search');
  const isSearching = Boolean(searchQuery);

  return (
    <div className="patient-list">
      <div className="patient-list-header">
        <div>
          <h1 className="page-title">
            {isSearching ? 'Search Results' : 'All Patients'}
          </h1>
          <p className="page-subtitle">
            {isSearching 
              ? `Found ${totalRecords} results for "${searchQuery}"`
              : `Showing ${patients.length} of ${totalRecords} patients`
            }
          </p>
        </div>
        
        <div className="list-actions">
          {isSearching && (
            <button 
              onClick={() => window.location.href = '/patients'}
              className="btn btn-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
              </svg>
              Clear Search
            </button>
          )}
          
          <button 
            onClick={toggleEditMode}
            className={`btn ${isEditMode ? 'btn-primary' : 'btn-secondary'}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15.502 1.94a.5.5 0 010 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 01.707 0l1.293 1.293zm-1.75 2.456l-2-2L4.939 9.21a.5.5 0 00-.121.196l-.805 2.414a.25.25 0 00.316.316l2.414-.805a.5.5 0 00.196-.12l6.813-6.814z"/>
              <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 002.5 15h11a1.5 1.5 0 001.5-1.5v-6a.5.5 0 00-1 0v6a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-11a.5.5 0 01.5-.5H9a.5.5 0 000-1H2.5A1.5 1.5 0 001 2.5v11z"/>
            </svg>
            {isEditMode ? 'Done Editing' : 'Edit Locations'}
          </button>
          
          <button 
            onClick={handleRefresh}
            className="btn btn-secondary"
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.534 7h3.932a.25.25 0 01.192.41l-1.966 2.36a.25.25 0 01-.384 0l-1.966-2.36a.25.25 0 01.192-.41zm-11 2h3.932a.25.25 0 00.192-.41L2.692 6.23a.25.25 0 00-.384 0L.342 8.59A.25.25 0 00.534 9z"/>
              <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 11-.771-.636A6.002 6.002 0 0113.917 7H12.9A5.002 5.002 0 008 3zM3.1 9a5.002 5.002 0 008.757 2.182.5.5 0 11.771.636A6.002 6.002 0 012.083 9H3.1z"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Patient Status Filter */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <PatientStatusFilter 
          includeArchived={includeArchived}
          onChange={setIncludeArchived}
        />
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {patients.length === 0 && !loading && (
        <div className="no-patients">
          <div className="no-patients-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="currentColor">
              <path d="M32 4C16.536 4 4 16.536 4 32s12.536 28 28 28 28-12.536 28-28S47.464 4 32 4zm0 8a20 20 0 110 40 20 20 0 010-40z" opacity="0.3"/>
              <path d="M32 20a12 12 0 100 24 12 12 0 000-24zm0 4a8 8 0 110 16 8 8 0 010-16z"/>
            </svg>
          </div>
          <h3>No Patients Found</h3>
          {isSearching ? (
            <p>Try adjusting your search terms or browse all patients.</p>
          ) : (
            <p>No patient files have been added yet.</p>
          )}
        </div>
      )}

      {patients.length > 0 && (
        <div className="patients-table-container">
          <table className="patients-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>Phone Number</th>
                <th>Status</th>
                <th>Actions</th>
                <th>Cabinet</th>
                <th>Shelf</th>
                <th>Folder</th>
                <th>Date Added</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => {
                const isExpanded = expandedRows.has(patient.patientId);
                const canAdmitDischarge = ['ADMINISTRATOR', 'RECORDS_OPERATOR', 'CLINICAL_STAFF'].includes(user?.accessLevel);
                const canArchive = ['ADMINISTRATOR', 'RECORDS_OPERATOR'].includes(user?.accessLevel);
                
                return (
                  <React.Fragment key={patient._id || patient.id}>
                    <tr className={isExpanded ? 'row-expanded' : ''}>
                      <td>{patient.patientId}</td>
                      <td>{patient.fullName}</td>
                      <td>{patient.phoneNumber}</td>
                      <td>
                        <PatientStatusBadge status={patient.status || 'discharged'} />
                      </td>
                      <td>
                        <select
                          className="status-picker"
                          value={patient.status || 'discharged'}
                          onChange={(e) => handleQuickStatusChange(patient.patientId, e.target.value)}
                          disabled={
                            (patient.status === 'discharged' && !canAdmitDischarge && !canArchive) ||
                            (patient.status === 'admitted' && !canAdmitDischarge) ||
                            (patient.status === 'archived' && !canArchive)
                          }
                        >
                          {/* Discharged can go to admitted or archived */}
                          {patient.status === 'discharged' && (
                            <>
                              <option value="discharged">-- Select Action --</option>
                              {canAdmitDischarge && <option value="admitted">Admit Patient</option>}
                              {canArchive && <option value="archived">Archive File</option>}
                            </>
                          )}
                          
                          {/* Admitted can discharge */}
                          {patient.status === 'admitted' && (
                            <>
                              <option value="admitted">-- Select Action --</option>
                              {canAdmitDischarge && <option value="discharged">↗ Discharge Patient</option>}
                            </>
                          )}
                          
                          {/* Archived can reactivate to discharged */}
                          {patient.status === 'archived' && (
                            <>
                              <option value="archived">-- Select Action --</option>
                              {canArchive && <option value="discharged">↻ Reactivate File</option>}
                            </>
                          )}
                        </select>
                      </td>
                      <td>
                    {isEditMode ? (
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={patient.cabinetNumber}
                        onChange={(e) => handleLocationUpdate(patient.patientId, 'cabinetNumber', parseInt(e.target.value) || '')}
                        onBlur={() => saveLocationIfChanged(patient.patientId)}
                      />
                    ) : (
                      patient.cabinetNumber
                    )}
                  </td>
                  <td>
                    {isEditMode ? (
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={patient.shelfNumber}
                        onChange={(e) => handleLocationUpdate(patient.patientId, 'shelfNumber', parseInt(e.target.value) || '')}
                        onBlur={() => saveLocationIfChanged(patient.patientId)}
                      />
                    ) : (
                      patient.shelfNumber
                    )}
                  </td>
                  <td>
                    {isEditMode ? (
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={patient.folderNumber}
                        onChange={(e) => handleLocationUpdate(patient.patientId, 'folderNumber', parseInt(e.target.value) || '')}
                        onBlur={() => saveLocationIfChanged(patient.patientId)}
                      />
                    ) : (
                      patient.folderNumber
                    )}
                  </td>
                  <td>{formatDate(patient.createdAt)}</td>
                </tr>
                {isExpanded && (
                  <tr className="expanded-row">
                    <td colSpan="9">
                      <div className="expanded-content">
                        <PatientStatusControl
                          patient={patient}
                          onChanged={(updated) => handlePatientStatusChanged(patient.patientId, updated)}
                          onDeleted={() => handlePatientDeleted(patient.patientId)}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Load More Button */}
      {!isSearching && hasMore && patients.length > 0 && (
        <div className="load-more-section">
          <button 
            onClick={loadMorePatients}
            disabled={loadingMore}
            className="btn btn-primary load-more-btn"
          >
            {loadingMore ? (
              <>
                <div className="spinner-small"></div>
                Loading more...
              </>
            ) : (
              `Load More Patients (${totalRecords - patients.length} remaining)`
            )}
          </button>
        </div>
      )}

      {/* End of Results Indicator */}
      {!hasMore && patients.length > 0 && !isSearching && (
        <div className="end-of-results">
          <p>You've reached the end of the patient list</p>
        </div>
      )}
    </div>
  );
};

export default PatientList;