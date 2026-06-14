import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
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
  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    fetchDashboardStats();
    updateGreeting();
    updateCurrentDate();
  }, []);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  };

  const updateCurrentDate = () => {
    const now = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setCurrentDate(now.toLocaleDateString('en-US', options));
  };

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

  if (loading) {
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

      {/* Greeting Card */}
      <div className="greeting-card">
        <div className="greeting-content">
          <div className="greeting-text">
            <h1 className="greeting-title">{greeting}!</h1>
            <p className="greeting-date">{currentDate}</p>
            <p className="greeting-subtitle">Welcome to De Tender Care's Patient File Management System</p>
          </div>
          <div className="greeting-illustration">
            {/* Placeholder for illustration - you can add your own */}
            <div className="illustration-placeholder">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="50" fill="var(--primary-100)" opacity="0.3"/>
                <circle cx="60" cy="60" r="35" fill="var(--primary-200)" opacity="0.5"/>
                <circle cx="60" cy="60" r="20" fill="var(--primary-300)" opacity="0.7"/>
                <path d="M60 45v30M45 60h30" stroke="var(--primary-600)" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">De Tender Care Dashboard</h2>
          <p className="dashboard-subtitle">Current status and key metrics</p>
        </div>
        <div className="header-actions">
          <Link to="/add-patient" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z"/>
            </svg>
            Add Patient
          </Link>
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
        </div>
      </div>

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
            <h2 className="card-title">De Tender Care File System</h2>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <strong>Purpose:</strong> Digital patient file indexing and location tracking for De Tender Care Hospital
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
    </div>
  );
};

export default Dashboard;