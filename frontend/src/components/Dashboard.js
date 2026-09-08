import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    patientsWithPhone: 0,
    cabinetCount: 0,
    staffCount: 0,
    recentPatients: [],
    onDutyStaff: []
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

  // Admin Notes state (Administrator only)
  const [adminNotes, setAdminNotes] = useState([]);
  const [adminNotesLoading, setAdminNotesLoading] = useState(false);
  const [showAdminNoteForm, setShowAdminNoteForm] = useState(false);
  const [adminNoteBody, setAdminNoteBody] = useState('');
  const [adminNoteError, setAdminNoteError] = useState('');
  const [adminNoteSubmitting, setAdminNoteSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteBody, setEditingNoteBody] = useState('');

  const NOTICE_LABELS = { update: 'Update', info: 'Info', urgent: 'Urgent' };
  const isAdmin = user?.accessLevel === 'ADMINISTRATOR';
  const isClinicalStaff = user?.accessLevel === 'CLINICAL_STAFF';

  useEffect(() => {
    const loadDashboard = async () => {
      if (isClinicalStaff) {
        await fetchMyShift();
        setLoading(false); // Set main loading to false for clinical staff
      } else {
        await fetchDashboardStats();
      }
      await fetchNotices();

      // Fetch admin notes for Administrators only
      if (isAdmin) {
        await fetchAdminNotes();
      }
    };

    loadDashboard();
  }, [isClinicalStaff, isAdmin, fetchMyShift]);

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

  const fetchMyShift = useCallback(async () => {
    if (!user?.staffId) {
      console.warn('No staffId found for user:', user);
      setMyShiftError('Staff information not available');
      setMyShiftLoading(false);
      return;
    }

    try {
      setMyShiftLoading(true);
      console.log('Fetching shift data for staffId:', user.staffId);
      const response = await axios.get(`/api/staff/${user.staffId}`);
      console.log('Shift data received:', response.data);
      setMyShift(response.data);
      setMyShiftError('');
    } catch (err) {
      console.error('Failed to fetch shift information:', err);
      console.error('Error response:', err.response?.data);
      setMyShiftError('Failed to load your shift information');
    } finally {
      setMyShiftLoading(false);
      console.log('fetchMyShift completed');
    }
  }, [user]);

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

  // Admin Notes functions
  const fetchAdminNotes = async () => {
    try {
      setAdminNotesLoading(true);
      const response = await axios.get('/api/admin-notes');
      setAdminNotes(response.data || []);
    } catch (err) {
      console.error('Failed to fetch admin notes:', err);
      setAdminNotes([]);
    } finally {
      setAdminNotesLoading(false);
    }
  };

  const handleAdminNoteSubmit = async (e) => {
    e.preventDefault();

    if (!adminNoteBody.trim()) {
      setAdminNoteError('Note cannot be empty');
      return;
    }

    if (adminNoteBody.length > 1000) {
      setAdminNoteError('Note cannot exceed 1000 characters');
      return;
    }

    setAdminNoteSubmitting(true);
    setAdminNoteError('');

    try {
      await axios.post('/api/admin-notes', {
        body: adminNoteBody.trim()
      });

      setAdminNoteBody('');
      setShowAdminNoteForm(false);
      await fetchAdminNotes();
    } catch (err) {
      setAdminNoteError(err.response?.data?.error || 'Failed to save note');
    } finally {
      setAdminNoteSubmitting(false);
    }
  };

  const handleAdminNoteEdit = async (noteId) => {
    if (!editingNoteBody.trim()) {
      setAdminNoteError('Note cannot be empty');
      return;
    }

    if (editingNoteBody.length > 1000) {
      setAdminNoteError('Note cannot exceed 1000 characters');
      return;
    }

    try {
      await axios.put(`/api/admin-notes/${noteId}`, {
        body: editingNoteBody.trim()
      });

      setEditingNoteId(null);
      setEditingNoteBody('');
      setAdminNoteError('');
      await fetchAdminNotes();
    } catch (err) {
      setAdminNoteError(err.response?.data?.error || 'Failed to update note');
    }
  };

  const handleAdminNoteDelete = async (noteId) => {
    if (!window.confirm('Delete this note?')) {
      return;
    }

    try {
      await axios.delete(`/api/admin-notes/${noteId}`);
      await fetchAdminNotes();
    } catch (err) {
      console.error('Failed to delete admin note:', err);
      alert(err.response?.data?.error || 'Failed to delete note');
    }
  };

  const formatNoteDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
          <h2 className="dashboard-title">Dashboard</h2>
          <p className="dashboard-subtitle">
            {isClinicalStaff ? 'Your shift and patient search' : 'Current status and key metrics'}
          </p>
        </div>
        <div className="header-actions">
          {/* Clinical Staff: Only "Find Patient" button */}
          {isClinicalStaff && (
            <Link to="/patients" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" />
              </svg>
              Find a Patient File
            </Link>
          )}

          {/* Administrator & Records Operator: Multiple actions */}
          {!isClinicalStaff && (
            <>
              <Link to="/add-patient" className="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z" />
                </svg>
                Add Patient
              </Link>
              {/* Administrator only: Add Staff button */}
              {isAdmin && (
                <Link to="/add-staff" className="btn btn-primary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm2-3a2 2 0 11-4 0 2 2 0 014 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                  </svg>
                  Add Staff
                </Link>
              )}
              <Link to="/patients" className="btn btn-secondary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                </svg>
                View All Files
              </Link>
              <button
                onClick={fetchDashboardStats}
                className="btn btn-outline"
                disabled={loading}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.534 7h3.932a.25.25 0 01.192.41l-1.966 2.36a.25.25 0 01-.384 0l-1.966-2.36a.25.25 0 01.192-.41zm-11 2h3.932a.25.25 0 00.192-.41L2.692 6.23a.25.25 0 00-.384 0L.342 8.59A.25.25 0 00.534 9z" />
                  <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 11-.771-.636A6.002 6.002 0 0113.917 7H12.9A5.002 5.002 0 008 3zM3.1 9a5.002 5.002 0 008.757 2.182.5.5 0 11.771.636A6.002 6.002 0 012.083 9H3.1z" />
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
              {showNoticeForm ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M2.5 7.5a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z" />
                  </svg>
                  {' Cancel'}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z" />
                  </svg>
                  {'Post Notice'}
                </>
              )}
            </button>
          ) : (
            <button
              disabled
              className="btn btn-outline"
              title="Administrator only"
              style={{ marginLeft: 'auto', fontSize: '0.875rem', padding: 'var(--space-2) var(--space-3)' }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z" />
              </svg>
              Post Notice
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
                      <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
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

      {/* Administrator only: My Notes panel - personal scratchpad, NOT bulletin board */}
      {isAdmin && (
        <section style={{ marginTop: 'var(--space-8)' }}>
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--gray-200)',
            padding: 'var(--space-4)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-4)'
            }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                  My Notes
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  Private notes visible only to you
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAdminNoteForm(!showAdminNoteForm);
                  setAdminNoteError('');
                  setAdminNoteBody('');
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.875rem', padding: 'var(--space-2) var(--space-3)' }}
              >
                {showAdminNoteForm ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M2.5 7.5a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z" />
                    </svg>
                    {' Cancel'}
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z" />
                    </svg>
                    {' Add Note'}
                  </>
                )}
              </button>
            </div>

            {showAdminNoteForm && (
              <form onSubmit={handleAdminNoteSubmit} style={{
                background: 'var(--gray-50)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
                border: '1px solid var(--gray-200)'
              }}>
                {adminNoteError && (
                  <div style={{
                    background: 'var(--error-50)',
                    color: 'var(--error-700)',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    marginBottom: 'var(--space-3)'
                  }}>
                    {adminNoteError}
                  </div>
                )}

                <textarea
                  value={adminNoteBody}
                  onChange={(e) => {
                    setAdminNoteBody(e.target.value);
                    if (adminNoteError) setAdminNoteError('');
                  }}
                  maxLength={1000}
                  placeholder="Write a note... (max 1000 characters)"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--gray-300)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    marginBottom: 'var(--space-2)'
                  }}
                  autoFocus
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    {adminNoteBody.length}/1000 characters
                  </span>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={adminNoteSubmitting}
                    style={{ fontSize: '0.875rem', padding: 'var(--space-2) var(--space-3)' }}
                  >
                    {adminNoteSubmitting ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </form>
            )}

            {adminNotesLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--gray-500)' }}>
                <div className="spinner" style={{ margin: '0 auto var(--space-2)' }}></div>
                <p style={{ fontSize: '0.875rem' }}>Loading notes...</p>
              </div>
            ) : adminNotes.length === 0 ? (
              <p style={{
                textAlign: 'center',
                color: 'var(--gray-500)',
                fontSize: '0.875rem',
                padding: 'var(--space-4)',
                fontStyle: 'italic'
              }}>
                No notes yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {adminNotes.map((note) => (
                  <div
                    key={note._id}
                    style={{
                      padding: 'var(--space-3)',
                      background: 'var(--gray-50)',
                      border: '1px solid var(--gray-200)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)'
                    }}
                  >
                    {editingNoteId === note._id ? (
                      <>
                        <textarea
                          value={editingNoteBody}
                          onChange={(e) => {
                            setEditingNoteBody(e.target.value);
                            if (adminNoteError) setAdminNoteError('');
                          }}
                          maxLength={1000}
                          rows={3}
                          style={{
                            width: '100%',
                            padding: 'var(--space-2)',
                            border: '1px solid var(--gray-300)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.875rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setEditingNoteId(null);
                              setEditingNoteBody('');
                              setAdminNoteError('');
                            }}
                            className="btn btn-outline"
                            style={{ fontSize: '0.75rem', padding: 'var(--space-1) var(--space-2)' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAdminNoteEdit(note._id)}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: 'var(--space-1) var(--space-2)' }}
                          >
                            Save
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <p style={{
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                            color: 'var(--gray-800)',
                            flex: 1,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            {note.body}
                          </p>
                          <div style={{ display: 'flex', gap: 'var(--space-1)', marginLeft: 'var(--space-2)' }}>
                            <button
                              onClick={() => {
                                setEditingNoteId(note._id);
                                setEditingNoteBody(note.body);
                                setAdminNoteError('');
                              }}
                              style={{
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
                              title="Edit note"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--primary-50)';
                                e.currentTarget.style.color = 'var(--primary-600)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'none';
                                e.currentTarget.style.color = 'var(--gray-400)';
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M12.146.146a.5.5 0 01.708 0l3 3a.5.5 0 010 .708l-10 10a.5.5 0 01-.168.11l-5 2a.5.5 0 01-.65-.65l2-5a.5.5 0 01.11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 015 12.5V12h-.5a.5.5 0 01-.5-.5V11h-.5a.5.5 0 01-.468-.325z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAdminNoteDelete(note._id)}
                              style={{
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
                              title="Delete note"
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
                                <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z" />
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--gray-500)',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span>{formatNoteDate(note.createdAt)}</span>
                          {note.updatedAt !== note.createdAt && (
                            <span>(edited)</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Clinical Staff: Show "My Weekly Schedule" card ONLY - no stats, no recent files, no on-duty list.
          This is intentional per FR-4.1 and FR-4.2 (Clinical Staff scope limited to shift info 
          and patient search). Not an oversight - do not add admin panels here. */}
      {isClinicalStaff && myShift && (
        <div className="my-shift-section">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">My Weekly Schedule</h2>
              <p className="card-subtitle">Your shift schedule for this week</p>
            </div>
            <div className="my-shift-content">
              <div className="shift-info-grid">
                <div className="shift-info-item">
                  <span className="shift-info-label">Role</span>
                  <span className="shift-info-value">{myShift.roleDisplay || 'Not assigned'}</span>
                </div>
                <div className="shift-info-item">
                  <span className="shift-info-label">Today's Shift</span>
                  <span className="shift-info-value">{myShift.shiftDisplay || 'Not set'}</span>
                </div>
                <div className="shift-info-item">
                  <span className="shift-info-label">Today's Status</span>
                  <span className={`shift-status-badge ${myShift.statusDisplay === 'On Duty' ? 'status-on-duty' : 'status-off-duty'}`}>
                    {myShift.statusDisplay || 'Off Duty'}
                  </span>
                </div>
              </div>
              {myShift.WeeklySchedule && (
                <div className="shift-schedule">
                  <h4 className="shift-schedule-title">Week at a Glance</h4>
                  <div className="Weekly-schedule-grid">
                    {[
                      { key: 'monday', label: 'Monday' },
                      { key: 'tuesday', label: 'Tuesday' },
                      { key: 'wednesday', label: 'Wednesday' },
                      { key: 'thursday', label: 'Thursday' },
                      { key: 'friday', label: 'Friday' },
                      { key: 'saturday', label: 'Saturday' },
                      { key: 'sunday', label: 'Sunday' }
                    ].map(day => {
                      const shift = myShift.WeeklySchedule[day.key] || 'off';
                      const shiftLabel = shift === 'day' ? 'Day' : shift === 'night' ? 'Night' : 'Off';
                      const isToday = (() => {
                        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                        return days[new Date().getDay()] === day.key;
                      })();

                      return (
                        <div
                          key={day.key}
                          className={`Weekly-schedule-day ${isToday ? 'is-today' : ''}`}
                          style={{
                            padding: 'var(--space-3)',
                            background: isToday ? 'var(--primary-50)' : 'var(--gray-50)',
                            border: isToday ? '2px solid var(--primary-200)' : '1px solid var(--gray-200)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-1)',
                            alignItems: 'center',
                            textAlign: 'center'
                          }}
                        >
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isToday ? 'var(--primary-700)' : 'var(--gray-600)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {day.label.slice(0, 3)}
                          </span>
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: shift === 'off' ? 'var(--gray-500)' : (isToday ? 'var(--primary-900)' : 'var(--gray-900)')
                          }}>
                            {shiftLabel}
                          </span>
                          {isToday && (
                            <span style={{
                              fontSize: '0.625rem',
                              color: 'var(--primary-600)',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              Today
                            </span>
                          )}
                        </div>
                      );
                    })}
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
          <div className="stat-strip">
            <Link to="/patients" className="stat-cell stat-cell-link">
              <span className="stat-label">Patient Files</span>
              <span className="stat-value">{stats.totalPatients.toLocaleString()}</span>
              <span className="stat-caption">Total files indexed</span>
            </Link>
            <Link to="/staff" className="stat-cell stat-cell-link">
              <span className="stat-label">Staff Users</span>
              <span className="stat-value">{stats.staffCount}</span>
              <span className="stat-caption">Active staff</span>
            </Link>
            <div className="stat-cell">
              <span className="stat-label">Storage</span>
              <span className="stat-value">{stats.cabinetCount}</span>
              <span className="stat-caption">Cabinets in use</span>
            </div>
          </div>

          <div className="content-grid">
            <div className="recent-files-card">
              <div className="card-header">
                <h2 className="card-title">Recent Files</h2>
                <p className="card-subtitle">Recently added patient files</p>
              </div>

              {stats.recentPatients && stats.recentPatients.length > 0 ? (
                <div className="file-list">
                  {stats.recentPatients.map((patient) => (
                    <Link
                      key={patient._id}
                      to={`/patients?search=${encodeURIComponent(patient.patientId)}`}
                      className="file-preview-row"
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
              ) : (
                <div style={{
                  padding: 'var(--space-6) 0',
                  textAlign: 'center',
                  color: 'var(--gray-500)'
                }}>
                  <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-3)' }}>
                    No patient files yet
                  </p>
                  <Link to="/add-patient" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z" />
                    </svg>
                    New Patient
                  </Link>
                </div>
              )}
            </div>

            {stats.onDutyStaff && stats.onDutyStaff.length > 0 && (
              <div className="on-duty-card">
                <div className="card-header">
                  <h2 className="card-title">On Duty Staff</h2>
                  <p className="card-subtitle">Staff scheduled for today</p>
                </div>

                <div className="staff-list">
                  {stats.onDutyStaff.map((staff) => (
                    <Link
                      key={staff._id}
                      to={`/staff?search=${encodeURIComponent(staff.employeeId)}`}
                      className="staff-preview-row"
                    >
                      <div className="staff-info">
                        <h4 className="staff-name">{staff.fullName}</h4>
                        <p className="staff-role">{formatRole(staff.role)}</p>
                      </div>
                      <div className="staff-status">
                        <span className="badge badge-on-duty">
                          {staff.shiftDisplay || 'On Duty'}
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