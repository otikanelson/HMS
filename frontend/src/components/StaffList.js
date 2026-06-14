import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './StaffList.css';

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filters, setFilters] = useState({ role: '', status: '', shift: '' });
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    // Fetch filter options
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    // Reset state when search params change
    setStaff([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchStaff(1, true);
  }, [searchParams, filters]);

  const fetchFilterOptions = async () => {
    try {
      const roleResponse = await axios.get('/api/staff/roles');
      setRoles(roleResponse.data.roles || []);
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  const fetchStaff = async (page = 1, reset = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');
      
      const searchQuery = searchParams.get('search');
      let url = `/api/staff?page=${page}&limit=20`;
      
      // Add filters to URL
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.shift) params.append('shift', filters.shift);
      
      if (searchQuery) {
        // For search queries, load all results at once (no pagination)
        url = `/api/staff/search?q=${encodeURIComponent(searchQuery)}`;
      } else {
        url = `/api/staff?${params.toString()}`;
      }
      
      const response = await axios.get(url);
      
      if (searchQuery) {
        // Search results - no pagination, show all results
        setStaff(response.data.staff || []);
        setTotalRecords(response.data.total || 0);
        setHasMore(false);
        setCurrentPage(1);
      } else {
        // Regular pagination with lazy loading
        const newStaff = response.data.staff || [];
        const pagination = response.data.pagination || {};
        
        if (reset || page === 1) {
          setStaff(newStaff);
        } else {
          setStaff(prev => [...prev, ...newStaff]);
        }
        
        setTotalRecords(pagination.totalRecords || 0);
        setHasMore(pagination.current < pagination.total);
        setCurrentPage(pagination.current);
      }
    } catch (err) {
      setError('Failed to load staff list');
      console.error('Staff list error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreStaff = () => {
    if (!loadingMore && hasMore && !searchParams.get('search')) {
      fetchStaff(currentPage + 1, false);
    }
  };

  const handleRefresh = () => {
    setStaff([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchStaff(1, true);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({ role: '', status: '', shift: '' });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatRole = (role) => {
    return role.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="staff-list">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading staff list...</p>
        </div>
      </div>
    );
  }

  const searchQuery = searchParams.get('search');
  const isSearching = Boolean(searchQuery);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div className="staff-list">
      <div className="staff-list-header">
        <div>
          <h1 className="page-title">
            {isSearching ? 'Staff Search Results' : 'De Tender Care Staff'}
          </h1>
          <p className="page-subtitle">
            {isSearching 
              ? `Found ${totalRecords} results for "${searchQuery}"`
              : `Showing ${staff.length} of ${totalRecords} staff members`
            }
            {activeFilters > 0 && ` (${activeFilters} filter${activeFilters > 1 ? 's' : ''} applied)`}
          </p>
        </div>
        
        <div className="list-actions">
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

      {/* Filters */}
      {!isSearching && (
        <div className="filters-section">
          <div className="filters-grid">
            <select 
              value={filters.role} 
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="filter-select"
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>

            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="on-duty">On Duty</option>
              <option value="off-duty">Off Duty</option>
            </select>

            <select 
              value={filters.shift} 
              onChange={(e) => handleFilterChange('shift', e.target.value)}
              className="filter-select"
            >
              <option value="">All Shifts</option>
              <option value="day">Day Shift</option>
              <option value="night">Night Shift</option>
            </select>

            {activeFilters > 0 && (
              <button onClick={clearFilters} className="btn btn-outline">
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {staff.length === 0 && !loading && (
        <div className="no-staff">
          <div className="no-staff-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="currentColor">
              <path d="M32 4C16.536 4 4 16.536 4 32s12.536 28 28 28 28-12.536 28-28S47.464 4 32 4zm0 8a20 20 0 110 40 20 20 0 010-40z" opacity="0.3"/>
              <path d="M32 20a12 12 0 100 24 12 12 0 000-24zm0 4a8 8 0 110 16 8 8 0 010-16z"/>
            </svg>
          </div>
          <h3>No Staff Found</h3>
          {isSearching ? (
            <p>Try adjusting your search terms or browse all staff.</p>
          ) : activeFilters > 0 ? (
            <p>No staff members match the current filters.</p>
          ) : (
            <p>No staff members have been added yet.</p>
          )}
        </div>
      )}

      {staff.length > 0 && (
        <div className="staff-table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Shift</th>
                <th>Phone Number</th>
                <th>Hire Date</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member._id || member.id}>
                  <td>{member.employeeId}</td>
                  <td>{member.fullName}</td>
                  <td>{formatRole(member.role)}</td>
                  <td>
                    <span className={`status-badge ${member.onDuty ? 'on-duty' : 'off-duty'}`}>
                      {member.onDuty ? 'On Duty' : 'Off Duty'}
                    </span>
                  </td>
                  <td>{member.shift ? member.shift.charAt(0).toUpperCase() + member.shift.slice(1) : '-'}</td>
                  <td>{member.phoneNumber || '-'}</td>
                  <td>{formatDate(member.hireDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Load More Button */}
      {!isSearching && hasMore && staff.length > 0 && (
        <div className="load-more-section">
          <button 
            onClick={loadMoreStaff}
            disabled={loadingMore}
            className="btn btn-primary load-more-btn"
          >
            {loadingMore ? (
              <>
                <div className="spinner-small"></div>
                Loading more...
              </>
            ) : (
              `Load More Staff (${totalRecords - staff.length} remaining)`
            )}
          </button>
        </div>
      )}

      {/* End of Results Indicator */}
      {!hasMore && staff.length > 0 && !isSearching && (
        <div className="end-of-results">
          <p>You've reached the end of the staff list</p>
        </div>
      )}
    </div>
  );
};

export default StaffList;