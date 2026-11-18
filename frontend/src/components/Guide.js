import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStepsForUser } from '../lib/guideSteps';
import GuideSnapshot from './GuideSnapshot';
import './Guide.css';

const Guide = ({ user, onClose, onComplete }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [cardPosition, setCardPosition] = useState({});
  const spotlightRef = useRef(null);
  const cardRef = useRef(null);
  const [startingPage, setStartingPage] = useState(null);
  const [elementNotFound, setElementNotFound] = useState(false);
  const retryTimeoutRef = useRef(null);

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

  // Find and position spotlight on target element
  const updateSpotlight = useCallback(() => {
    const currentStepData = steps[currentStep];
    
    if (!currentStepData?.target) {
      setSpotlightRect(null);
      setElementNotFound(false);
      return;
    }

    const targetElement = document.querySelector(`[data-guide="${currentStepData.target}"]`);
    
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const padding = 8;
      
      // Calculate visible height (for tall elements like columns)
      const visibleHeight = Math.min(rect.height, window.innerHeight - rect.top);
      
      setSpotlightRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: visibleHeight + padding * 2
      });
      
      setElementNotFound(false);
      
      // Scroll target into view
      targetElement.scrollIntoView({ behavior: 'auto', block: 'center' });
    } else {
      setSpotlightRect(null);
      setElementNotFound(true);
    }
  }, [currentStep, steps]);

  // Position card beside spotlight
  const computeCardPosition = useCallback(() => {
    if (!spotlightRect || !cardRef.current) return {};

    const cardHeight = cardRef.current.offsetHeight;
    const cardWidth = 420;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 24;

    // Try right first
    if (spotlightRect.left + spotlightRect.width + gap + cardWidth < viewportWidth) {
      return {
        top: Math.max(16, Math.min(spotlightRect.top + spotlightRect.height / 2 - cardHeight / 2, viewportHeight - cardHeight - 16)),
        left: spotlightRect.left + spotlightRect.width + gap
      };
    }
    // Try left
    if (spotlightRect.left - gap - cardWidth > 0) {
      return {
        top: Math.max(16, Math.min(spotlightRect.top + spotlightRect.height / 2 - cardHeight / 2, viewportHeight - cardHeight - 16)),
        left: spotlightRect.left - gap - cardWidth
      };
    }
    // Try below
    if (spotlightRect.top + spotlightRect.height + gap + cardHeight < viewportHeight) {
      return {
        top: spotlightRect.top + spotlightRect.height + gap,
        left: Math.max(16, Math.min(spotlightRect.left + spotlightRect.width / 2 - cardWidth / 2, viewportWidth - cardWidth - 16))
      };
    }
    // Try above
    if (spotlightRect.top - gap - cardHeight > 0) {
      return {
        top: spotlightRect.top - gap - cardHeight,
        left: Math.max(16, Math.min(spotlightRect.left + spotlightRect.width / 2 - cardWidth / 2, viewportWidth - cardWidth - 16))
      };
    }
    // Fallback: center bottom
    return { 
      top: viewportHeight - cardHeight - 16, 
      left: Math.max(16, Math.min(viewportWidth / 2 - cardWidth / 2, viewportWidth - cardWidth - 16))
    };
  }, [spotlightRect]);

  // Define handlers using useCallback before they're used in useEffects
  const handleSkip = useCallback(() => {
    onComplete();
    // Navigate back to starting page if we navigated away
    if (startingPage && startingPage !== window.location.pathname) {
      navigate(startingPage);
    }
  }, [onComplete, startingPage, navigate]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
      // Navigate back to starting page if we navigated away
      if (startingPage && startingPage !== window.location.pathname) {
        navigate(startingPage);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  }, [isLastStep, onComplete, startingPage, navigate, currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Store starting page on first mount
  useEffect(() => {
    setStartingPage(window.location.pathname);
  }, []);

  // Navigate to route if specified
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const currentStepData = steps[currentStep];
    if (currentStepData?.route && currentStepData.route !== window.location.pathname) {
      navigate(currentStepData.route);
    }
  }, [currentStep, steps, navigate]);

  // Add highlight and animation styles for steps with highlight/animate props
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const currentStepData = steps[currentStep];
    
    if (currentStepData?.highlight && currentStepData?.animate && currentStepData?.target) {
      const targetElement = document.querySelector(`[data-guide="${currentStepData.target}"]`);
      if (targetElement) {
        targetElement.classList.add('guide-highlight-animated');
      }
      
      return () => {
        if (targetElement) {
          targetElement.classList.remove('guide-highlight-animated');
        }
      };
    }
  }, [currentStep, steps]);

  // Handle opening menus for specific steps
  useEffect(() => {
    const currentStepData = steps[currentStep];
    
    if (currentStepData?.openMenu) {
      // Check if menu is already open by looking for the dropdown element
      const dropdown = document.querySelector('.put-back-menu-dropdown');
      if (!dropdown) {
        // Menu is closed, so click to open it
        const menuButton = document.querySelector('.put-back-menu-btn');
        if (menuButton) {
          // Use setTimeout to avoid state updates during render
          setTimeout(() => {
            menuButton.click();
          }, 0);
        }
      }
    }
  }, [currentStep, steps]);

  // Update card position when spotlight changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCardPosition(computeCardPosition());
  }, [spotlightRect, computeCardPosition]);

  // Handle Escape key
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleSkip]);

  // Update spotlight on step change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    updateSpotlight();
  }, [currentStep, updateSpotlight]);

  // Recompute spotlight on resize/scroll
  useEffect(() => {
    const handleResize = () => updateSpotlight();
    const handleScroll = () => updateSpotlight();
    const interval = setInterval(updateSpotlight, 500);

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      clearInterval(interval);
    };
  }, [updateSpotlight]);

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
          lastFocusable?.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      };

      document.addEventListener('keydown', handleTabKey);
      firstFocusable?.focus();
      return () => document.removeEventListener('keydown', handleTabKey);
    }
  }, [currentStep]);

  const currentStepData = steps[currentStep];
  const content = typeof currentStepData.content === 'function'
    ? currentStepData.content(firstName, role)
    : currentStepData.content;

  // Parse bold text (**text**)
  const renderContent = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Block clicks on dimmed area and spotlight
  const handleOverlayClick = (e) => {
    e.preventDefault();
  };

  return (
    <div className="guide-overlay" onClick={handleOverlayClick}>
      {spotlightRect && (
        <>
          <div
            ref={spotlightRef}
            className="guide-spotlight"
            style={{
              top: `${spotlightRect.top}px`,
              left: `${spotlightRect.left}px`,
              width: `${spotlightRect.width}px`,
              height: `${spotlightRect.height}px`
            }}
            onClick={handleOverlayClick}
          />
          <div className="guide-spotlight-dim" />
        </>
      )}
      <div
        ref={cardRef}
        className="guide-card"
        style={spotlightRect ? cardPosition : {}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="guide-header">
          <span className="guide-progress">Step {currentStep + 1} of {totalSteps}</span>
        </div>
        
        {/* Show snapshot if specified */}
        {currentStepData?.snapshot && (
          <GuideSnapshot stepNumber={currentStepData.snapshot} />
        )}

        <div className="guide-content">
          <h2 className="guide-title">{currentStepData.title}</h2>
          <p className="guide-text">{renderContent(content)}</p>
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
