import React from 'react';
import './GuideSnapshot.css';

const GuideSnapshot = ({ stepNumber, image }) => {
  return (
    <div className="guide-snapshot">
      {image ? (
        <img src={image} alt={`Step ${stepNumber} snapshot`} className="guide-snapshot-image" />
      ) : (
        <div className="guide-snapshot-placeholder">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="6" width="36" height="36" rx="2" />
            <circle cx="18" cy="18" r="3" />
            <path d="M6 30l12-12 12 12M42 18v12a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h32a2 2 0 012 2v10" />
          </svg>
          <p className="guide-snapshot-text">Step {stepNumber} screenshot</p>
          <p className="guide-snapshot-subtext">Image will be added here</p>
        </div>
      )}
    </div>
  );
};

export default GuideSnapshot;
