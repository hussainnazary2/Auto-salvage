import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Chatbot.css';
import OllamaService, { OllamaConnectionError } from '../services/OllamaService.js';
import ConversationManager from '../services/ConversationManager.js';
import ConnectionMonitor from './ConnectionMonitor.js';
import ConnectionQualityIndicator from './ConnectionQualityIndicator.js';
import TimeoutProgressIndicator from './TimeoutProgressIndicator.js';
import chatbotConfig from '../config/ChatbotConfig.js';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({ mode: 'normal', message: '', canUseAI: true });
  
  // Network reliability state
  const [timeoutProgress, setTimeoutProgress] = useState({
    isActive: false,
    progress: 0,
    elapsedTime: 0,
    showWarning: false,
    requestId: null
  });
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  const [queueStatus, setQueueStatus] = useState({ queueLength: 0, isProcessing: false });
  const messagesEndRef = useRef(null);
  
  // Service refs
  const ollamaService = useRef(null);
  const conversationManager = useRef(null);
  
  // Messages state - will be initialized after services are ready
  const [messages, setMessages] = useState([]);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    // Reset conversation when closing chatbot for privacy
    if (isOpen) {
      conversationManager.current.clearHistory();
      const welcomeMessage = conversationManager.current.addMessage(
        "Hello! I'm your car buying assistant. I can help you with selling your damaged car in New Zealand. How can I assist you today?",
        true
      );
      setMessages([welcomeMessage]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleConnectionStatusChange = useCallback((status) => {
    setConnectionStatus(status.status);
    
    // Update service status for UI display
    if (ollamaService.current) {
      const newServiceStatus = ollamaService.current.getServiceStatus();
      setServiceStatus(newServiceStatus);
      
      // Update queue status when connection changes
      const queueInfo = ollamaService.current.getRequestQueueStatus();
      setQueueStatus(queueInfo);
    }
    
    // Show user-friendly messages for status changes
    if (status.status === 'connected' && connectionStatus !== 'connected') {
      console.log('AI service connected successfully');
    } else if (status.status === 'error' && connectionStatus === 'connected') {
      console.warn('AI service connection lost:', status.error);
    }
  }, [connectionStatus]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize services once
  useEffect(() => {
    if (!ollamaService.current) {
      ollamaService.current = new OllamaService();
    }
    if (!conversationManager.current) {
      conversationManager.current = new ConversationManager(chatbotConfig.getChatConfig().maxHistoryLength);
      
      // Add welcome message
      const welcomeMessage = conversationManager.current.addMessage(
        "Hello! I'm your car buying assistant. I can help you with selling your damaged car in New Zealand. How can I assist you today?",
        true
      );
      setMessages([welcomeMessage]);
    }
  }, []);

  // Update network reliability status periodically
  useEffect(() => {
    const updateNetworkStatus = () => {
      if (ollamaService.current) {
        const quality = ollamaService.current.getConnectionQuality();
        const queue = ollamaService.current.getRequestQueueStatus();
        
        setConnectionQuality(quality.quality);
        setQueueStatus(queue);
      }
    };

    // Initial update
    updateNetworkStatus();

    // Set up periodic updates
    const interval = setInterval(updateNetworkStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const service = ollamaService.current;
    
    return () => {
      service.destroy();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessageText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // Add user message to conversation
      const userMessage = conversationManager.current.addMessage(userMessageText, false);
      setMessages(prev => [...prev, userMessage]);

      // Create placeholder bot message for streaming
      const botMessage = conversationManager.current.addMessage('', true);
      setMessages(prev => [...prev, botMessage]);
      setStreamingMessageId(botMessage.id);

      // Get conversation context
      const conversationHistory = conversationManager.current.getContextForOllama();

      // Set up timeout progress tracking
      const requestId = `chat_${Date.now()}`;
      setTimeoutProgress({
        isActive: true,
        progress: 0,
        elapsedTime: 0,
        showWarning: false,
        requestId
      });

      // Send message with streaming and fallback support
      await ollamaService.current.sendMessageStreamWithFallback(
        userMessageText,
        conversationHistory,
        (_, fullResponse) => {
          // Update the bot message with streaming response
          const updatedMessage = conversationManager.current.updateMessage(botMessage.id, {
            text: fullResponse
          });
          
          if (updatedMessage) {
            setMessages(prev => prev.map(msg => 
              msg.id === botMessage.id ? updatedMessage : msg
            ));
          }
        },
        {
          priority: 'normal',
          onTimeout: (type, timeout) => {
            if (type === 'warning') {
              setTimeoutProgress(prev => ({
                ...prev,
                showWarning: true
              }));
            }
          },
          onProgress: (progress, elapsed, showWarning) => {
            setTimeoutProgress(prev => ({
              ...prev,
              progress,
              elapsedTime: elapsed,
              showWarning
            }));
          }
        }
      );

    } catch (error) {
      console.error('Chat error:', error);
      
      let errorMessage = chatbotConfig.getChatConfig().fallbackMessages.unknownError;
      let showRetryOption = false;
      let showReconnectOption = false;
      
      if (error instanceof OllamaConnectionError) {
        // Use the error message directly as it's already categorized
        errorMessage = error.message;
        
        // Determine if we should show retry option based on error type
        const retryableErrors = ['timeout', 'network', 'connection', 'server'];
        showRetryOption = retryableErrors.includes(error.type);
        
        // Determine if we should show reconnect option
        const reconnectableErrors = ['connection', 'network', 'timeout'];
        showReconnectOption = reconnectableErrors.includes(error.type);
        
        // Enhanced error context for remote connections
        const isRemote = ollamaService.current.isRemoteConnection();
        
        if (error.type === 'cors') {
          if (isRemote) {
            errorMessage += "\n\n💡 This is likely because the remote Ollama server needs CORS configuration. " +
                          "Please set OLLAMA_ORIGINS environment variable on your PC to include this website's domain.";
          } else {
            errorMessage += " This appears to be a configuration issue that requires technical support.";
          }
        } else if (error.type === 'auth') {
          errorMessage += " Please contact support for assistance with access permissions.";
        } else if (error.type === 'model') {
          errorMessage += " The AI model may need to be downloaded or updated.";
        } else if (error.type === 'timeout' && isRemote) {
          errorMessage += "\n\n💡 Remote connections can be slower. The service might be under load or " +
                         "your internet connection may be experiencing delays.";
        } else if (error.type === 'connection' && isRemote) {
          errorMessage += "\n\n💡 Please check that:\n" +
                         "• Your PC is online and Ollama is running\n" +
                         "• The remote access method (ngrok, tunnel, etc.) is active\n" +
                         "• Firewall settings allow the connection";
        } else if (error.type === 'network' && isRemote) {
          errorMessage += "\n\n💡 This could be due to:\n" +
                         "• Network connectivity issues\n" +
                         "• DNS resolution problems\n" +
                         "• The remote service being temporarily unavailable";
        }
      }

      // Add action suggestions
      if (showRetryOption && showReconnectOption) {
        errorMessage += "\n\n🔄 You can try again or use the reconnect button in the header.";
      } else if (showRetryOption) {
        errorMessage += "\n\n🔄 Please try again in a moment.";
      } else if (showReconnectOption) {
        errorMessage += "\n\n🔄 Try using the reconnect button in the header.";
      }

      // Update the bot message with error
      if (streamingMessageId) {
        const updatedMessage = conversationManager.current.updateMessage(streamingMessageId, {
          text: errorMessage
        });
        
        if (updatedMessage) {
          setMessages(prev => prev.map(msg => 
            msg.id === streamingMessageId ? updatedMessage : msg
          ));
        }
      } else {
        // Add new error message if no streaming message exists
        const errorMsg = conversationManager.current.addMessage(errorMessage, true);
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      
      // Clear timeout progress
      setTimeoutProgress({
        isActive: false,
        progress: 0,
        elapsedTime: 0,
        showWarning: false,
        requestId: null
      });
    }
  };

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="header-content">
              <div className="header-title">
                <h3>Car Buying Assistant</h3>
                {/* Enhanced connection status for remote scenarios */}
                {chatbotConfig.getUIConfig().showConnectionStatus && (
                  <div className={`connection-status-header ${connectionStatus}`}>
                    <ConnectionMonitor 
                      ollamaService={ollamaService.current}
                      onStatusChange={handleConnectionStatusChange}
                      compact={true}
                      showReconnectButton={connectionStatus === 'error' || connectionStatus === 'disconnected'}
                    />
                    {/* Show connection quality for remote connections */}
                    {connectionStatus === 'connected' && ollamaService.current.isRemoteConnection() && (
                      <ConnectionQualityIndicator
                        networkManager={ollamaService.current.getNetworkReliabilityManager()}
                        showDetails={false}
                        onQualityChange={(quality) => {
                          setConnectionQuality(quality);
                        }}
                        className="compact inline"
                      />
                    )}
                  </div>
                )}
              </div>
              
              {/* Service status indicators */}
              <div className="service-indicators">
                {serviceStatus.mode === 'degraded' && (
                  <div className="service-status degraded" title={serviceStatus.message}>
                    ⚠️ Limited Mode
                  </div>
                )}
                
                {/* Remote connection specific indicators */}
                {ollamaService.current.isRemoteConnection() && (
                  <div className="remote-connection-indicator" title="Connected to remote AI service">
                    🌐 Remote
                  </div>
                )}
                
                {/* Queue status for slow connections */}
                {queueStatus.queueLength > 0 && (
                  <div className="queue-status" title={`${queueStatus.queueLength} requests queued`}>
                    📋 {queueStatus.queueLength}
                  </div>
                )}
              </div>
            </div>
            
            <div className="header-actions">
              {chatbotConfig.getUIConfig().showConnectionStatus && (
                <button 
                  className="connection-details-btn"
                  onClick={() => setShowConnectionDetails(!showConnectionDetails)}
                  title="Toggle connection details"
                >
                  ℹ️
                </button>
              )}
              <button className="close-btn" onClick={toggleChatbot}>×</button>
            </div>
          </div>
          {showConnectionDetails && (
            <div className="connection-details">
              <ConnectionMonitor 
                ollamaService={ollamaService.current}
                onStatusChange={handleConnectionStatusChange}
                compact={false}
                showReconnectButton={true}
              />
            </div>
          )}
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}
              >
                {message.text}
              </div>
            ))}
            
            {/* Enhanced Loading States for Remote Connections */}
            {isLoading && (
              <div className="loading-container">
                {/* Standard typing indicator */}
                <div className="message bot-message loading-message">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="loading-text">
                    {ollamaService.current.isRemoteConnection() 
                      ? "Connecting to remote AI service..." 
                      : "Processing your request..."}
                  </span>
                </div>
                
                {/* Timeout Progress Indicator for slower connections */}
                {chatbotConfig.getNetworkConfig().showTimeoutProgress && timeoutProgress.isActive && (
                  <TimeoutProgressIndicator
                    isActive={timeoutProgress.isActive}
                    progress={timeoutProgress.progress}
                    elapsedTime={timeoutProgress.elapsedTime}
                    showTimeoutWarning={timeoutProgress.showWarning}
                    onCancel={() => {
                      // Cancel the current request
                      ollamaService.current.clearRequestQueue('Request cancelled by user');
                      setTimeoutProgress({
                        isActive: false,
                        progress: 0,
                        elapsedTime: 0,
                        showWarning: false,
                        requestId: null
                      });
                      setIsLoading(false);
                      setStreamingMessageId(null);
                    }}
                    message={ollamaService.current.isRemoteConnection() 
                      ? "Waiting for remote AI service response..." 
                      : "Processing your request..."}
                    warningMessage={ollamaService.current.isRemoteConnection()
                      ? "Remote connection is slower than usual. This may be due to network latency or service load."
                      : "This is taking longer than usual. The connection may be slow."}
                    className="compact"
                  />
                )}
                
                {/* Connection quality warning for remote connections */}
                {ollamaService.current.isRemoteConnection() && 
                 connectionQuality === 'poor' && 
                 timeoutProgress.elapsedTime > 10000 && (
                  <div className="connection-quality-warning">
                    ⚠️ Slow connection detected. Remote responses may take longer than usual.
                  </div>
                )}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          <form className="chatbot-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !inputValue.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
      <button className="chatbot-button" onClick={toggleChatbot}>
        {isOpen ? '×' : '💬'}
      </button>
    </div>
  );
};

export default Chatbot;