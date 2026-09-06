import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    patientsWithPhone: 0,
    cabinetCount: 0,
    staffCount: 5, // Mock staff count for now
    recentPatients: [],
    onDutyStaff: [] // Add on duty staff state
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Clinical Staff: My Shift data
  const [myShift, setMyShift] = useState(null);
  const [myShiftLoading, setMyShiftLoading] = useState(false);
  const [myShiftError, setMyShiftError] = useState('');
  
  // Notices state
  const [notices, setNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    body: '',
    type: 'info'
  });
  const [noticeFormError, setNoticeFormError] = useState('');
  const [noticeFormSubmitting, setNoticeFormSubmitting] = useState(false);

  const NOTICE_LABELS = { update: 'Update', info: 'Info', urgent: 'Urgent' };
  const isAdmin = user?.accessLevel === 'ADMINISTRATOR';
  const isClinicalStaff = user?.accessLevel === 'CLINICAL_STAFF';

  useEffect(() => {
    if (isClinicalStaff) {
      fetchMyShift();
    } else {
      fetchDashboardStats();
    }
    fetchNotices();
  }, [isClinicalStaff]);

  const formatRole = (role) => {
    return role.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const response = await axios.get('/api/dashboard/stats');
      
      // Fetch on duty staff
      let onDutyStaff = [];
      try {
        const staffResponse = await axios.get('/api/staff?status=on-duty&limit=5');
        onDutyStaff = staffResponse.data.staff || [];
      } catch (staffErr) {
        console.warn('Failed to fetch on duty staff:', staffErr);
      }

      setStats({
        ...response.data,
        staffCount: 5, // Mock staff count until we implement staff management
        onDutyStaff
      });
      setError('');
    } catch (err) {
      setError('Failed to load dashboard statistics');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyShift = async () => {
    if (!user?.staffId) {
      setMyShiftError('Staff information not available');
      setMyShiftLoading(false);
      return;
    }

    try {
      setMyShiftLoading(true);
      const response = await axios.get(`/api/staff/${user.staffId}`);
      setMyShift(response.data);
      setMyShiftError('');
    } catch (err) {
      console.error('Failed to fetch shift information:', err);
      setMyShiftError('Failed to load your shift information');
    } finally {
      setMyShiftLoading(false);
    }
  };

  const fetchNotices = async () => {
    try {
      setNoticesLoading(true);
      const response = await axios.get('/api/notices');
      setNotices(response.data.notices || []);
    } catch (err) {
      // Non-critical widget - just log error, don't show to user
      console.error('Failed to fetch notices:', err);
      setNotices([]);
    } finally {
      setNoticesLoading(false);
    }
  };

  const handleNoticeInputChange = (e) => {
    const { name, value } = e.target;
    setNoticeForm(prev => ({
      ...prev,
      [name]: value
    }));
    if (noticeFormError) {
      setNoticeFormError('');
    }
  };

  const handleNoticeSubmit = async (e) => {
    e.preventDefault();
    
    if (!noticeForm.title.trim()) {
      setNoticeFormError('Title is required');
      return;
    }
    
    if (!noticeForm.body.trim()) {
      setNoticeFormError('Body is required');
      return;
    }

    setNoticeFormSubmitting(true);
    setNoticeFormError('');

    try {
      await axios.post('/api/notices', {
        title: noticeForm.title.trim(),
        body: noticeForm.body.trim(),
        type: noticeForm.type
      });

      // Reset form and refresh notices
      setNoticeForm({ title: '', body: '', type: 'info' });
      setShowNoticeForm(false);
      await fetchNotices();
    } catch (err) {
      setNoticeFormError(err.response?.data?.error || 'Failed to post notice');
    } finally {
      setNoticeFormSubmitting(false);
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (!window.confirm('Remove this notice?')) {
      return;
    }

    try {
      await axios.delete(`/api/notices/${noticeId}`);
      await fetchNotices();
    } catch (err) {
      console.error('Failed to delete notice:', err);
      alert(err.response?.data?.error || 'Failed to remove notice');
    }
  };

  const formatNoticeDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading || myShiftLoading) {
    return (
      <div className="dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">Tender Care Dashboard</h2>
          <p className="dashboard-subtitle">
            {isClinicalStaff ? 'Your shift and patient search' : 'Current status and key metrics'}
          </p>
        </div>
        <div className="header-actions">
          {/* Clinical Staff: Only "Find Patient" button */}
          {isClinicalStaff && (
            <Link to="/patients" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
              </svg>
              Find a Patient File
            </Link>
          )}

          {/* Administrator & Records Operator: Multiple actions */}
          {!isClinicalStaff && (
            <>
              <Link to="/add-patient" className="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z"/>
                </svg>
                Add Patient
              </Link>
              {/* Administrator only: Add Staff button */}
              {isAdmin && (
                <Link to="/add-staff" className="btn btn-primary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm2-3a2 2 0 11-4 0 2 2 0 014 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                  </svg>
                  Add Staff
                </Link>
              )}
              <Link to="/patients" className="btn btn-secondary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                </svg>
                View All Files
              </Link>
              <button 
                onClick={fetchDashboardStats}
                className="btn btn-outline"
                disabled={loading}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.534 7h3.932a.25.25 0 01.192.41l-1.966 2.36a.25.25 0 01-.384 0l-1.966-2.36a.25.25 0 01.192-.41zm-11 2h3.932a.25.25 0 00.192-.41L2.692 6.23a.25.25 0 00-.384 0L.342 8.59A.25.25 0 00.534 9z"/>
                  <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 11-.771-.636A6.002 6.002 0 0113.917 7H12.9A5.002 5.002 0 008 3zM3.1 9a5.002 5.002 0 008.757 2.182.5.5 0 11.771.636A6.002 6.002 0 012.083 9H3.1z"/>
                </svg>
                Refresh
              </button>
            </>
          )}
        </div>
      </div>

      <section className="notices-board-section" aria-label="Staff notices">
        <div className="notices-board-heading">
          <h2>Staff Notices</h2>
          <span className="notices-board-heading-line" aria-hidden="true" />
          {isAdmin ? (
            <button
              onClick={() => setShowNoticeForm(!showNoticeForm)}
              className="btn btn-primary"
              style={{ marginLeft: 'auto', fontSize: '0.875rem', padding: 'var(--space-2) var(--space-3)' }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z"/>
              </svg>
              {showNoticeForm ? 'Cancel' : '+ Post Notice'}
            </button>
          ) : (
            <button
              disabled
              className="btn btn-outline"
              title="Administrator only"
              style={{ marginLeft: 'auto', fontSize: '0.875rem', padding: 'var(--space-2) var(--space-3)' }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z"/>
              </svg>
              + Post Notice
            </button>
          )}
        </div>

        {showNoticeForm && isAdmin && (
          <form onSubmit={handleNoticeSubmit} style={{
            background: 'white',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            border: '1px solid var(--gray-300)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {noticeFormError && (
              <div style={{
                background: 'var(--error-50)',
                color: 'var(--error-700)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                marginBottom: 'var(--space-3)'
              }}>
                {noticeFormError}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label htmlFor="notice-title" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                  Title
                </label>
                <input
                  type="text"
                  id="notice-title"
                  name="title"
                  value={noticeForm.title}
                  onChange={handleNoticeInputChange}
                  maxLength={120}
                  placeholder="Notice title (max 120 characters)"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--gray-300)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="notice-body" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                  Body
                </label>
                <textarea
                  id="notice-body"
                  name="body"
                  value={noticeForm.body}
                  onChange={handleNoticeInputChange}
                  maxLength={500}
                  placeholder="Notice body (max 500 characters)"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--gray-300)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label htmlFor="notice-type" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                  Type
                </label>
                <select
                  id="notice-type"
                  name="type"
                  value={noticeForm.type}
                  onChange={handleNoticeInputChange}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--gray-300)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    background: 'white'
                  }}
                >
                  <option value="info">Info</option>
                  <option value="update">Update</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNoticeForm(false);
                    setNoticeForm({ title: '', body: '', type: 'info' });
                    setNoticeFormError('');
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={noticeFormSubmitting}
                >
                  {noticeFormSubmitting ? (
                    <>
                      <div className="spinner" style={{ width: '14px', height: '14px' }}></div>
                      Posting...
                    </>
                  ) : (
                    'Post Notice'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {noticesLoading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--gray-500)' }}>
            <div className="spinner" style={{ margin: '0 auto var(--space-2)' }}></div>
            <p style={{ fontSize: '0.875rem' }}>Loading notices...</p>
          </div>
        ) : notices.length === 0 ? (
          <p style={{ 
            textAlign: 'center', 
            color: 'var(--gray-500)', 
            fontSize: '0.875rem',
            padding: 'var(--space-4)',
            fontStyle: 'italic'
          }}>
            No notices right now
          </p>
        ) : (
          <div className="notice-board">
            {notices.map((notice, i) => (
              <article key={notice._id} className={`notice-card notice-card-${i % 3} notice-type-${notice.type}`}>
                <span className="notice-pin" aria-hidden="true" />
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteNotice(notice._id)}
                    style={{
                      position: 'absolute',
                      top: 'var(--space-2)',
                      right: 'var(--space-2)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--gray-400)',
                      cursor: 'pointer',
                      padding: 'var(--space-1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all 150ms ease'
                    }}
                    title="Remove notice"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--error-50)';
                      e.currentTarget.style.color = 'var(--error-600)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = 'var(--gray-400)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
                    </svg>
                  </button>
                )}
                <div className="notice-card-top">
                  <span className="notice-badge">{NOTICE_LABELS[notice.type]}</span>
                  <span className="notice-date">{formatNoticeDate(notice.createdAt)}</span>
                </div>
                <h3>{notice.title}</h3>
                <p>{notice.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Clinical Staff: Show "My Shift" card ONLY - no stats, no recent files, no on-duty list.
          This is intentional per FR-4.1 and FR-4.2 (Clinical Staff scope limited to shift info 
          and patient search). Not an oversight - do not add admin panels here. */}
      {isClinicalStaff && myShift && (
        <div className="my-shift-section">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">My Shift Today</h2>
              <p className="card-subtitle">Your current shift information</p>
            </div>
            <div className="my-shift-content">
              <div className="shift-info-grid">
                <div className="shift-info-item">
                  <span className="shift-info-label">Role</span>
                  <span className="shift-info-value">{myShift.roleDisplay || 'Not assigned'}</span>
                </div>
                <div className="shift-info-item">
                  <span className="shift-info-label">Shift</span>
                  <span className="shift-info-value">{myShift.shiftDisplay || 'Not set'}</span>
                </div>
                <div className="shift-info-item">
                  <span className="shift-info-label">Status</span>
                  <span className={`shift-status-badge ${myShift.onDuty ? 'status-on-duty' : 'status-off-duty'}`}>
                    {myShift.statusDisplay || 'Unknown'}
                  </span>
                </div>
              </div>
              {myShift.schedule && myShift.schedule.length > 0 && (
                <div className="shift-schedule">
                  <h4 className="shift-schedule-title">Weekly Schedule</h4>
                  <div className="shift-schedule-list">
                    {myShift.schedule.map((day, idx) => (
                      <div key={idx} className="schedule-day">
                        <span className="schedule-day-name">{day.day}</span>
                        <span className="schedule-time">{day.startTime} - {day.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isClinicalStaff && myShiftError && (
        <div className="alert alert-error" style={{ marginTop: 'var(--space-6)' }}>
          {myShiftError}
        </div>
      )}

      {/* Administrator & Records Operator: Show stats-grid, recent files, on-duty staff */}
      {!isClinicalStaff && (
        <>
          <div className="stats-grid">
        <Link to="/patients" className="stat-card stat-card-clickable">
          <div className="stat-header">
            <h3>Patient Files</h3>
            <div className="stat-icon stat-icon-primary">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
              </svg>
            </div>
          </div>
          <div className="stat-value">{stats.totalPatients.toLocaleString()}</div>
          <div className="stat-description">Total files indexed • Click to view all</div>
          <div className="stat-click-indicator">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M4 8a.5.5 0 01.5-.5h5.793L8.146 5.354a.5.5 0 11.708-.708l3 3a.5.5 0 010 .708l-3 3a.5.5 0 01-.708-.708L10.293 8.5H4.5A.5.5 0 014 8z"/>
            </svg>
          </div>
        </Link>

        <div className="stat-card stat-card-clickable" onClick={() => navigate('/staff')} title="Staff management">
          <div className="stat-header">
            <h3>Staff Users</h3>
            <div className="stat-icon stat-icon-success">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
              </svg>
            </div>
          </div>
          <div className="stat-value">{stats.staffCount}</div>
          <div className="stat-description">Active staff • Click to view all</div>
          <div className="stat-click-indicator">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M4 8a.5.5 0 01.5-.5h5.793L8.146 5.354a.5.5 0 11.708-.708l3 3a.5.5 0 010 .708l-3 3a.5.5 0 01-.708-.708L10.293 8.5H4.5A.5.5 0 014 8z"/>
            </svg>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Storage</h3>
            <div className="stat-icon stat-icon-info">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM4 9a2 2 0 100 4h12a2 2 0 100-4H4zM4 15a2 2 0 100 4h12a2 2 0 100-4H4z"/>
              </svg>
            </div>
          </div>
          <div className="stat-value">{stats.cabinetCount}</div>
          <div className="stat-description">Cabinets in use</div>
        </div>
      </div>

      <div className="content-grid">
        {stats.recentPatients && stats.recentPatients.length > 0 && (
          <div className="recent-files-card">
            <div className="card-header">
              <h2 className="card-title">Recent Files</h2>
              <p className="card-subtitle">Recently added patient files</p>
            </div>

            <div className="file-list">
              {stats.recentPatients.map((patient) => (
                <Link 
                  key={patient._id} 
                  to={`/patients?search=${encodeURIComponent(patient.patientId)}`}
                  className="file-item clickable-item"
                >
                  <div className="file-info">
                    <h4 className="file-name">{patient.fullName}</h4>
                    <p className="file-id">ID: {patient.patientId}</p>
                  </div>
                  <div className="file-location">
                    <span className="badge badge-location">
                      {patient.locationDisplay}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {stats.onDutyStaff && stats.onDutyStaff.length > 0 && (
          <div className="on-duty-card">
            <div className="card-header">
              <h2 className="card-title">On Duty Staff</h2>
              <p className="card-subtitle">Currently active staff members</p>
            </div>

            <div className="staff-list">
              {stats.onDutyStaff.map((staff) => (
                <Link 
                  key={staff._id} 
                  to={`/staff?search=${encodeURIComponent(staff.employeeId)}`}
                  className="staff-item clickable-item"
                >
                  <div className="staff-info">
                    <h4 className="staff-name">{staff.fullName}</h4>
                    <p className="staff-role">{formatRole(staff.role)}</p>
                  </div>
                  <div className="staff-status">
                    <span className="badge badge-on-duty">
                      On Duty
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="info-panel">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Tender Care File System</h2>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <strong>Purpose:</strong> Digital patient file indexing and location tracking for Tender Care Hospital
            </div>
            <div className="info-item">
              <strong>Data Policy:</strong> No medical records stored - location and contact data only
            </div>
            <div className="info-item">
              <strong>Search Methods:</strong> Patient ID, full name, or phone number
            </div>
            <div className="info-item">
              <strong>File Format:</strong> Cabinet → Shelf → Folder numbering system
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;