import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const OpenVisitsContext = createContext();

export const OpenVisitsProvider = ({ children }) => {
  const [visits, setVisits] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');
  
  const fetchInProgressRef = useRef(false);
  const timerRef = useRef(null);

  // Calculate counts from visits
  const getCounts = useCallback(() => {
    const finding = visits.filter(v => v.stage === 'waiting_for_file').length;
    const doctor = visits.filter(v => v.stage === 'with_doctor').length;
    const desk = visits.filter(v => v.stage === 'needs_recording').length;
    const total = visits.length;
    
    return { finding, doctor, desk, total };
  }, [visits]);

  // Fetch open visits
  const fetchOpenVisits = useCallback(async () => {
    // Skip if a fetch is already in progress
    if (fetchInProgressRef.current) {
      return;
    }

    // Skip if browser tab is hidden
    if (document.hidden) {
      return;
    }

    try {
      fetchInProgressRef.current = true;
      const response = await axios.get('/api/visits/open');
      setVisits(response.data.visits || []);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      console.error('Failed to fetch open visits:', err);
      setError('Failed to load visits');
    } finally {
      fetchInProgressRef.current = false;
    }
  }, []);

  // Refresh function to be called manually
  const refresh = useCallback(async () => {
    await fetchOpenVisits();
  }, [fetchOpenVisits]);

  // Set up auto-refresh timer
  useEffect(() => {
    // Initial fetch
    fetchOpenVisits();

    // Set up 30-second interval
    const startTimer = () => {
      timerRef.current = setInterval(() => {
        if (!document.hidden && !fetchInProgressRef.current) {
          fetchOpenVisits();
        }
      }, 30000);
    };

    startTimer();

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible, fetch immediately
        fetchOpenVisits();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOpenVisits]);

  const value = {
    visits,
    counts: getCounts(),
    lastUpdated,
    error,
    refresh
  };

  return (
    <OpenVisitsContext.Provider value={value}>
      {children}
    </OpenVisitsContext.Provider>
  );
};

export const useOpenVisits = () => {
  const context = useContext(OpenVisitsContext);
  if (!context) {
    throw new Error('useOpenVisits must be used within OpenVisitsProvider');
  }
  return context;
};
