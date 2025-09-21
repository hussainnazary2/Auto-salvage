/**
 * Connection Monitor Component
 * Provides visual indicators and status management for Ollama connection
 * Handles automatic reconnection and user-friendly status messages
 */

import React, { useState, useEffect, useCallback } from 'react';
import './ConnectionMonitor.css';

const ConnectionMonitor = ({ 
  ollamaService, 
  onStatusChange, 
  showReconnectButton = true,
  compact = false 
}) => {
  const [connectionStatus, setConnectionStatus] = useState({
    status: 'disconnected',
    lastChecked: null,
    error: null,
    responseTime: null,
    availableModels: [],
    currentModel: null
  });
  
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastReconnectTime, setLastReconnectTime] = useState(null);

  // Update connection status from service
  const updateConnectionStatus = useCallback(() => {
    if (ollamaService) {
      const status = ollamaService.getConnectionStatus();
      setConnectionStatus(prevStatus => {
        // Only update if status actually changed to prevent unnecessary re-renders
        if (JSON.stringify(prevStatus) !== JSON.stringify(status)) {
          // Notify parent component of status changes
          if (onStatusChange) {
            onStatusChange(status);
          }
          return status;
        }
        return prevStatus;
      });
    }
  }, [ollamaService, onStatusChange]);

  // Manual reconnection handler
  const handleReconnect = useCallback(async () => {
    if (!ollamaService || isReconnecting) return;
    
    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    setLastReconnectTime(new Date());
    
    try {
      await ollamaService.checkConnection();
      updateConnectionStatus();
      
      // Reset reconnect attempts on successful connection
      if (connectionStatus.status === 'connected') {
        setReconnectAttempts(0);
      }
    } catch (error) {
      console.warn('Manual reconnection failed:', error.message);
      updateConnectionStatus();
    } finally {
      setIsReconnecting(false);
    }
  }, [ollamaService, isReconnecting, connectionStatus.status, updateConnectionStatus]);

  // Automatic reconnection logic
  useEffect(() => {
    if (!ollamaService) return;

    let reconnectTimeout;
    
    // Attempt automatic reconnection when disconnected or in error state
    if ((connectionStatus.status === 'disconnected' || connectionStatus.status === 'error') && 
        !isReconnecting && 
        reconnectAttempts < 5) { // Limit automatic attempts
      
      // Progressive delay: 2s, 4s, 8s, 16s, 32s
      const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 32000);
      
      reconnectTimeout = setTimeout(() => {
        handleReconnect();
      }, delay);
    }

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [connectionStatus.status, isReconnecting, reconnectAttempts, handleReconnect, ollamaService]);

  // Monitor connection status changes
  useEffect(() => {
    if (!ollamaService) return;

    // Initial status update only - no periodic polling
    updateConnectionStatus();

    // Note: Removed periodic status updates to prevent excessive requests
    // Status will be updated when user interacts with the chatbot or manually reconnects
  }, [ollamaService, updateConnectionStatus]);

  // Force update when ollamaService changes (for testing)
  useEffect(() => {
    if (ollamaService) {
      updateConnectionStatus();
    }
  }, [ollamaService, updateConnectionStatus]);

  // Get status display information
  const getStatusInfo = () => {
    const { status, error, responseTime } = connectionStatus;
    
    switch (status) {
      case 'connected':
        return {
          text: 'Online',
          description: responseTime ? `Response time: ${responseTime}ms` : 'Connected to AI service',
          className: 'connected',
          icon: '🟢'
        };
      
      case 'connecting':
        return {
          text: 'Connecting...',
          description: 'Establishing connection to AI service',
          className: 'connecting',
          icon: '🟡'
        };
      
      case 'disconnected':
        return {
          text: 'Offline',
          description: 'AI service is not available',
          className: 'disconnected',
          icon: '🔴'
        };
      
      case 'error':
        return {
          text: 'Error',
          description: error || 'Connection error occurred',
          className: 'error',
          icon: '⚠️'
        };
      
      default:
        return {
          text: 'Unknown',
          description: 'Connection status unknown',
          className: 'unknown',
          icon: '❓'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const canReconnect = !isReconnecting && 
                      (connectionStatus.status === 'disconnected' || connectionStatus.status === 'error');

  // Compact view for header display
  if (compact) {
    return (
      <div className={`connection-monitor compact ${statusInfo.className}`}>
        <span className="status-indicator" title={statusInfo.description}>
          {statusInfo.icon}
        </span>
        <span className="status-text">{statusInfo.text}</span>
        {canReconnect && showReconnectButton && (
          <button 
            className="reconnect-btn compact"
            onClick={handleReconnect}
            disabled={isReconnecting}
            title="Reconnect to AI service"
          >
            🔄
          </button>
        )}
      </div>
    );
  }

  // Full view for detailed display
  return (
    <div className={`connection-monitor ${statusInfo.className}`}>
      <div className="status-header">
        <div className="status-main">
          <span className="status-indicator">{statusInfo.icon}</span>
          <div className="status-info">
            <span className="status-text">{statusInfo.text}</span>
            <span className="status-description">{statusInfo.description}</span>
          </div>
        </div>
        
        {canReconnect && showReconnectButton && (
          <button 
            className="reconnect-btn"
            onClick={handleReconnect}
            disabled={isReconnecting}
          >
            {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
          </button>
        )}
      </div>

      {/* Additional status details */}
      <div className="status-details">
        {connectionStatus.lastChecked && (
          <div className="status-detail">
            <span className="detail-label">Last checked:</span>
            <span className="detail-value">
              {connectionStatus.lastChecked.toLocaleTimeString()}
            </span>
          </div>
        )}
        
        {connectionStatus.currentModel && (
          <div className="status-detail">
            <span className="detail-label">Model:</span>
            <span className="detail-value">{connectionStatus.currentModel}</span>
          </div>
        )}
        
        {connectionStatus.availableModels.length > 0 && (
          <div className="status-detail">
            <span className="detail-label">Available models:</span>
            <span className="detail-value">
              {connectionStatus.availableModels.length} model(s)
            </span>
          </div>
        )}
        
        {reconnectAttempts > 0 && (
          <div className="status-detail">
            <span className="detail-label">Reconnect attempts:</span>
            <span className="detail-value">{reconnectAttempts}</span>
          </div>
        )}
        
        {lastReconnectTime && (
          <div className="status-detail">
            <span className="detail-label">Last reconnect:</span>
            <span className="detail-value">
              {lastReconnectTime.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Connection quality indicator */}
      {connectionStatus.status === 'connected' && connectionStatus.responseTime && (
        <div className="connection-quality">
          <div className="quality-label">Connection Quality:</div>
          <div className={`quality-bar ${getQualityClass(connectionStatus.responseTime)}`}>
            <div 
              className="quality-fill"
              style={{ width: `${getQualityPercentage(connectionStatus.responseTime)}%` }}
            />
          </div>
          <div className="quality-text">{getQualityText(connectionStatus.responseTime)}</div>
        </div>
      )}
    </div>
  );
};

// Helper functions for connection quality assessment
const getQualityClass = (responseTime) => {
  if (responseTime < 1000) return 'excellent';
  if (responseTime < 3000) return 'good';
  if (responseTime < 5000) return 'fair';
  return 'poor';
};

const getQualityPercentage = (responseTime) => {
  // Convert response time to quality percentage (lower is better)
  const maxTime = 10000; // 10 seconds = 0% quality
  const percentage = Math.max(0, Math.min(100, 100 - (responseTime / maxTime) * 100));
  return percentage;
};

const getQualityText = (responseTime) => {
  if (responseTime < 1000) return 'Excellent';
  if (responseTime < 3000) return 'Good';
  if (responseTime < 5000) return 'Fair';
  return 'Poor';
};

export default ConnectionMonitor;