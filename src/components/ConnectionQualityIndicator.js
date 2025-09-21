/**
 * Connection Quality Indicator Component
 * Displays real-time connection quality and network statistics
 */

import React, { useState, useEffect } from 'react';
import './ConnectionQualityIndicator.css';

const ConnectionQualityIndicator = ({ 
  networkManager, 
  showDetails = false, 
  onQualityChange = null,
  className = '' 
}) => {
  const [qualityInfo, setQualityInfo] = useState({
    quality: 'unknown',
    averageResponseTime: 0,
    qualityDescription: 'Connection quality unknown'
  });
  const [queueStatus, setQueueStatus] = useState({
    queueLength: 0,
    isProcessing: false
  });
  const [statistics, setStatistics] = useState({
    successRate: 0,
    totalRequests: 0
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!networkManager) return;

    const updateQualityInfo = () => {
      const quality = networkManager.getConnectionQuality();
      const queue = networkManager.getQueueStatus();
      const stats = networkManager.getStatistics();

      setQualityInfo(quality);
      setQueueStatus(queue);
      setStatistics(stats);

      // Notify parent of quality changes
      if (onQualityChange) {
        onQualityChange(quality.quality, quality.averageResponseTime);
      }
    };

    // Initial update
    updateQualityInfo();

    // Set up periodic updates
    const interval = setInterval(updateQualityInfo, 2000);

    return () => clearInterval(interval);
  }, [networkManager, onQualityChange]);

  const getQualityIcon = (quality) => {
    const icons = {
      excellent: '🟢',
      good: '🟡',
      slow: '🟠',
      poor: '🔴',
      unknown: '⚪'
    };
    return icons[quality] || icons.unknown;
  };

  const getQualityColor = (quality) => {
    const colors = {
      excellent: '#22c55e',
      good: '#eab308',
      slow: '#f97316',
      poor: '#ef4444',
      unknown: '#6b7280'
    };
    return colors[quality] || colors.unknown;
  };

  const formatResponseTime = (time) => {
    if (time < 1000) {
      return `${Math.round(time)}ms`;
    } else {
      return `${(time / 1000).toFixed(1)}s`;
    }
  };

  const formatSuccessRate = (rate) => {
    return `${rate.toFixed(1)}%`;
  };

  return (
    <div className={`connection-quality-indicator ${className}`}>
      <div 
        className="quality-summary"
        onClick={() => showDetails && setIsExpanded(!isExpanded)}
        style={{ cursor: showDetails ? 'pointer' : 'default' }}
      >
        <span 
          className="quality-icon"
          title={qualityInfo.qualityDescription}
        >
          {getQualityIcon(qualityInfo.quality)}
        </span>
        
        <span className="quality-text">
          {qualityInfo.quality === 'unknown' ? 'Checking...' : 
           `${formatResponseTime(qualityInfo.averageResponseTime)}`}
        </span>

        {queueStatus.queueLength > 0 && (
          <span className="queue-indicator" title={`${queueStatus.queueLength} requests queued`}>
            📋 {queueStatus.queueLength}
          </span>
        )}

        {showDetails && (
          <span className="expand-icon">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
      </div>

      {showDetails && isExpanded && (
        <div className="quality-details">
          <div className="detail-section">
            <h4>Connection Quality</h4>
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span 
                className="detail-value"
                style={{ color: getQualityColor(qualityInfo.quality) }}
              >
                {qualityInfo.quality.charAt(0).toUpperCase() + qualityInfo.quality.slice(1)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Avg Response:</span>
              <span className="detail-value">
                {formatResponseTime(qualityInfo.averageResponseTime)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Success Rate:</span>
              <span className="detail-value">
                {formatSuccessRate(statistics.successRate)}
              </span>
            </div>
          </div>

          {queueStatus.queueLength > 0 && (
            <div className="detail-section">
              <h4>Request Queue</h4>
              <div className="detail-item">
                <span className="detail-label">Queued:</span>
                <span className="detail-value">{queueStatus.queueLength}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Processing:</span>
                <span className="detail-value">
                  {queueStatus.isProcessing ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          )}

          <div className="detail-section">
            <h4>Statistics</h4>
            <div className="detail-item">
              <span className="detail-label">Total Requests:</span>
              <span className="detail-value">{statistics.totalRequests}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Successful:</span>
              <span className="detail-value">{statistics.successfulRequests}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Failed:</span>
              <span className="detail-value">{statistics.failedRequests}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Timeouts:</span>
              <span className="detail-value">{statistics.timeoutRequests}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionQualityIndicator;