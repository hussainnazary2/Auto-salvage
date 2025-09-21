/**
 * Timeout Progress Indicator Component
 * Shows request progress and timeout warnings with appropriate user feedback
 */

import React, { useState, useEffect } from 'react';
import './TimeoutProgressIndicator.css';

const TimeoutProgressIndicator = ({ 
  isActive = false,
  progress = 0,
  timeoutDuration = 30000,
  elapsedTime = 0,
  showTimeoutWarning = false,
  onCancel = null,
  message = "Processing your request...",
  warningMessage = "This is taking longer than usual...",
  className = ''
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      setDisplayProgress(progress);
    } else {
      // Fade out after a short delay
      const timer = setTimeout(() => {
        setIsVisible(false);
        setDisplayProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isActive, progress]);

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
  };

  const getProgressColor = () => {
    if (showTimeoutWarning) {
      return '#ef4444'; // Red for warning
    } else if (displayProgress > 80) {
      return '#f97316'; // Orange for high progress
    } else if (displayProgress > 60) {
      return '#eab308'; // Yellow for medium progress
    } else {
      return '#3b82f6'; // Blue for normal progress
    }
  };

  const getProgressMessage = () => {
    if (showTimeoutWarning) {
      return warningMessage;
    } else if (displayProgress > 90) {
      return "Almost done...";
    } else if (displayProgress > 70) {
      return "Still processing...";
    } else {
      return message;
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`timeout-progress-indicator ${className} ${showTimeoutWarning ? 'warning' : ''}`}>
      <div className="progress-content">
        <div className="progress-header">
          <span className="progress-message">
            {getProgressMessage()}
          </span>
          <span className="progress-time">
            {formatTime(elapsedTime)}
          </span>
        </div>

        <div className="progress-bar-container">
          <div 
            className="progress-bar"
            style={{
              width: `${Math.min(displayProgress, 100)}%`,
              backgroundColor: getProgressColor(),
              transition: 'width 0.3s ease, background-color 0.3s ease'
            }}
          />
          <div className="progress-bar-background" />
        </div>

        <div className="progress-footer">
          <div className="progress-details">
            <span className="progress-percentage">
              {Math.round(displayProgress)}%
            </span>
            {showTimeoutWarning && (
              <span className="timeout-warning">
                ⚠️ Connection may be slow
              </span>
            )}
          </div>

          {onCancel && (
            <button 
              className="cancel-button"
              onClick={onCancel}
              title="Cancel request"
            >
              ✕
            </button>
          )}
        </div>

        {showTimeoutWarning && (
          <div className="warning-details">
            <p>The request is taking longer than expected. This might be due to:</p>
            <ul>
              <li>Slow network connection</li>
              <li>High server load</li>
              <li>Complex AI processing</li>
            </ul>
            <p>Please wait a bit longer or try again.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeoutProgressIndicator;