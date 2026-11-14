import React, { useState, useEffect } from 'react';
import { getStepsForUser } from '../lib/guideSteps';
import './Guide.css';

const Guide = ({ user, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = getStepsForUser(user?.accessLevel);
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;

  // Extract first name from full name
  const firstName = user?.fullName?.split(' ')[0] || 'User';

  // Format role for display
  const formatRole = (accessLevel) => {
    if (!accessLevel) return 'Staff';
    const roleMap = {
      'ADMINISTRATOR': 'Administrator',
      'RECORDS_OPERATOR': 'Records Operator',
      'CLINICAL_STAFF': 'Clinical Staff'
    };
    return roleMap[accessLevel] || accessLevel;
  };

  const role = formatRole(user?.accessLevel);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trap focus inside the guide
  useEffect(() => {
    const guideElement = document.querySelector('.guide-card');
    if (guideElement) {
      const focusableElements = guideElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      const handleTabKey = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      };

      document.addEventListener('keydown', handleTabKey);
      firstFocusable?.focus();
      return () => document.removeEventListener('keydown', handleTabKey);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentStepData = steps[currentStep];
  const content = typeof currentStepData.content === 'function'
    ? currentStepData.content(firstName, role)
    : currentStepData.content;

  return (
    <div className="guide-overlay" onClick={handleSkip}>
      <div className="guide-card" onClick={(e) => e.stopPropagation()}>
        <div className="guide-header">
          <span className="guide-progress">Step {currentStep + 1} of {totalSteps}</span>
        </div>
        <div className="guide-content">
          <h2 className="guide-title">{currentStepData.title}</h2>
          <p className="guide-text">{content}</p>
        </div>
        <div className="guide-actions">
          <button
            type="button"
            onClick={handleSkip}
            className="guide-btn guide-btn-skip"
          >
            Skip
          </button>
          <div className="guide-nav-buttons">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="guide-btn guide-btn-secondary"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="guide-btn guide-btn-primary"
            >
              {isLastStep ? 'Got it, start using the system' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide;
