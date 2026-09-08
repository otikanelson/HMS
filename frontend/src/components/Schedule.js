import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import WeeklySchedule from './WeeklySchedule';
import './Schedule.css';

const Schedule = () => {
  const { user } = useAuth();

  return (
    <div className="schedule-page">
      <div className="schedule-page-header">
        <div>
          <h1 className="page-title">Staff Schedule</h1>
          <p className="page-subtitle">
            {user?.accessLevel === 'ADMINISTRATOR' 
              ? 'Manage weekly staff schedules'
              : 'View weekly staff schedules'
            }
          </p>
        </div>
      </div>

      <WeeklySchedule />
    </div>
  );
};

export default Schedule;
