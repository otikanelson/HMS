import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './Hint.css';

const Hint = ({ hintId, title, message, action }) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!hintId || !user) return;

    try {
      // Check sessionStorage for this user
      const userId = user.userId || user.id;
      const storageKey = `hint:${userId}:${hintId}`;
      const isDismissed = sessionStorage.getItem(storageKey) === 'true';

      if (!isDismissed) {
        setIsVisible(true);
        startDismissTimer();
      }
    } catch (err) {
      // If storage fails, show anyway
      setIsVisible(true);
      startDismissTimer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintId, user]);

  const startDismissTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => {
        handleDismiss();
      }, 400); // 0.4s fade duration
    }, 6000); // 6 second display
  };

  const handlePauseTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleResumeTimer = () => {
    startDismissTimer();
  };

  const handleDismiss = () => {
    if (hintId && user) {
      try {
        const userId = user.userId || user.id;
        const storageKey = `hint:${userId}:${hintId}`;
        sessionStorage.setItem(storageKey, 'true');
      } catch (err) {
        // Silently fail if storage not available
      }
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className={`hint-container ${isFading ? 'hint-fading' : ''}`}
      onMouseEnter={handlePauseTimer}
      onMouseLeave={handleResumeTimer}
      onFocus={handlePauseTimer}
      onBlur={handleResumeTimer}
    >
      <div className="hint-content">
        <div className="hint-icon">💡</div>
        <div className="hint-body">
          {title && <h4 className="hint-title">{title}</h4>}
          <p className="hint-message">{message}</p>
        </div>
      </div>
      {action && (
        <div className="hint-action">
          {action}
        </div>
      )}
    </div>
  );
};

export default Hint;
