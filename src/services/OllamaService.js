/**
 * Enhanced Ollama Service with Remote Connection Support
 * Handles CORS, connection health checking, retry logic, and timeout handling
 * for both local development and remote production deployments
 */

import chatbotConfig from '../config/ChatbotConfig.js';
import CorsProxyService from './CorsProxyService.js';
import NetworkReliabilityManager from './NetworkReliabilityManager.js';

class OllamaConnectionError extends Error {
  constructor(message, type = 'connection', originalError = null) {
    super(message);
    this.name = 'OllamaConnectionError';
    this.type = type; // 'connection', 'timeout', 'cors', 'model', 'network'
    this.originalError = originalError;
  }
}

class OllamaService {
  constructor() {
    this.config = chatbotConfig.getOllamaConfig();
    this.chatConfig = chatbotConfig.getChatConfig();
    this.networkConfig = chatbotConfig.getNetworkConfig();
    this.uiConfig = chatbotConfig.getUIConfig();
    
    this.connectionStatus = {
      status: 'disconnected', // 'connected', 'disconnected', 'connecting', 'error'
      lastChecked: null,
      availableModels: [],
      currentModel: this.config.model,
      error: null,
      responseTime: null
    };
    
    this.healthCheckInterval = null;
    this.retryHandler = new RetryHandler(this.config.retryAttempts, this.chatConfig);
    this.corsProxyService = new CorsProxyService(this.networkConfig);
    this.networkReliabilityManager = new NetworkReliabilityManager({
      maxQueueSize: this.networkConfig.maxQueueSize || 10,
      slowConnectionThreshold: this.config.timeout * 0.6, // 60% of timeout
      verySlowConnectionThreshold: this.config.timeout * 0.8, // 80% of timeout
      timeoutGracePeriod: Math.min(this.config.timeout * 0.1, 5000) // 10% of timeout, max 5s
    });
    
    // Start health monitoring if enabled
    if (this.networkConfig.healthCheckInterval > 0) {
      this.startHealthMonitoring();
    }
  }

  /**
   * Check connection to Ollama server with enhanced error detection
   */
  async checkConnection() {
    const startTime = Date.now();
    this.connectionStatus.status = 'connecting';
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for health check
      
      const options = this.getFetchOptions('GET', null, controller.signal);
      
      const response = await this.makeRequest('/api/tags', options);
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const { errorType, errorMessage } = this.categorizeHttpError(response.status, response.statusText);
        throw new OllamaConnectionError(errorMessage, errorType);
      }
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      this.connectionStatus = {
        status: 'connected',
        lastChecked: new Date(),
        availableModels: data.models?.map(m => m.name) || [],
        currentModel: this.config.model,
        error: null,
        responseTime
      };
      
      // Verify current model is available
      if (this.connectionStatus.availableModels.length > 0 && 
          !this.connectionStatus.availableModels.includes(this.config.model)) {
        console.warn(`Model '${this.config.model}' not found. Available models:`, 
                    this.connectionStatus.availableModels);
      }
      
      return true;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const { errorType, errorMessage } = this.categorizeConnectionError(error);
      
      this.connectionStatus = {
        status: 'error',
        lastChecked: new Date(),
        availableModels: [],
        currentModel: this.config.model,
        error: errorMessage,
        responseTime
      };
      
      throw new OllamaConnectionError(errorMessage, errorType, error);
    }
  }

  /**
   * Send message to Ollama with enhanced error handling and retry logic
   */
  async sendMessage(message, conversationHistory = [], options = {}) {
    const requestId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return this.networkReliabilityManager.executeRequest(
      requestId,
      async (signal) => {
        return this.retryHandler.executeWithRetry(async () => {
          return await this._sendMessageInternal(message, conversationHistory, signal);
        });
      },
      {
        timeout: this.config.timeout,
        priority: options.priority || 'normal',
        onTimeout: options.onTimeout,
        onProgress: options.onProgress
      }
    );
  }

  /**
   * Internal method for sending messages (used by retry logic)
   */
  async _sendMessageInternal(message, conversationHistory, signal = null) {
    // Check connection before sending
    if (this.connectionStatus.status !== 'connected') {
      try {
        await this.checkConnection();
      } catch (error) {
        // Re-throw with proper categorization
        throw error;
      }
    }
    
    const prompt = this.buildPrompt(message, conversationHistory);
    const controller = signal ? { signal } : new AbortController();
    const timeoutId = signal ? null : setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const requestBody = {
        model: this.config.model,
        prompt: prompt,
        stream: false, // Non-streaming for simple responses
        options: {
          temperature: this.config.parameters.temperature,
          num_predict: this.config.parameters.max_tokens,
          top_p: this.config.parameters.top_p
        }
      };
      const options = this.getFetchOptions('POST', requestBody, signal || controller.signal);
      
      const response = await this.makeRequest('/api/generate', options);
      
      if (timeoutId) clearTimeout(timeoutId);
      
      if (!response.ok) {
        const { errorType, errorMessage } = this.categorizeHttpError(response.status, response.statusText);
        throw new OllamaConnectionError(errorMessage, errorType);
      }
      
      const data = await response.json();
      
      if (!data.response) {
        throw new OllamaConnectionError(
          'Invalid response from Ollama service',
          'connection'
        );
      }
      
      return data.response;
      
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (error instanceof OllamaConnectionError) {
        throw error;
      }
      
      // Categorize the error properly
      const { errorType, errorMessage } = this.categorizeConnectionError(error);
      throw new OllamaConnectionError(errorMessage, errorType, error);
    }
  }

  /**
   * Send message with streaming response
   */
  async sendMessageStream(message, conversationHistory = [], onChunk, options = {}) {
    const requestId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return this.networkReliabilityManager.executeRequest(
      requestId,
      async (signal) => {
        return this.retryHandler.executeWithRetry(async () => {
          return await this._sendMessageStreamInternal(message, conversationHistory, onChunk, signal);
        });
      },
      {
        timeout: this.config.timeout,
        priority: options.priority || 'normal',
        onTimeout: options.onTimeout,
        onProgress: options.onProgress
      }
    );
  }

  /**
   * Internal method for streaming messages
   */
  async _sendMessageStreamInternal(message, conversationHistory, onChunk, signal = null) {
    // Check connection before sending
    if (this.connectionStatus.status !== 'connected') {
      try {
        await this.checkConnection();
      } catch (error) {
        // Re-throw with proper categorization
        throw error;
      }
    }
    
    const prompt = this.buildPrompt(message, conversationHistory);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const requestBody = {
        model: this.config.model,
        prompt: prompt,
        stream: true,
        options: {
          temperature: this.config.parameters.temperature,
          num_predict: this.config.parameters.max_tokens,
          top_p: this.config.parameters.top_p
        }
      };
      const options = this.getFetchOptions('POST', requestBody, controller.signal);
      
      const response = await this.makeRequest('/api/generate', options);
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const { errorType, errorMessage } = this.categorizeHttpError(response.status, response.statusText);
        throw new OllamaConnectionError(errorMessage, errorType);
      }
      
      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            try {
              const data = JSON.parse(line);
              if (data.response) {
                fullResponse += data.response;
                if (onChunk) {
                  onChunk(data.response, fullResponse);
                }
              }
              
              if (data.done) {
                return fullResponse;
              }
            } catch (parseError) {
              console.warn('Error parsing streaming response:', parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      return fullResponse;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof OllamaConnectionError) {
        throw error;
      }
      
      // Categorize the error properly
      const { errorType, errorMessage } = this.categorizeConnectionError(error);
      throw new OllamaConnectionError(errorMessage, errorType, error);
    }
  }

  /**
   * Build prompt with conversation history
   */
  buildPrompt(message, conversationHistory) {
    let prompt = this.chatConfig.systemPrompt + '\n\n';
    
    // Add conversation history (limit to maxHistoryLength)
    const recentHistory = conversationHistory.slice(-this.chatConfig.maxHistoryLength);
    recentHistory.forEach(msg => {
      if (msg.isBot) {
        prompt += `Assistant: ${msg.text}\n`;
      } else {
        prompt += `User: ${msg.text}\n`;
      }
    });
    
    // Add current message
    prompt += `User: ${message}\n`;
    prompt += 'Assistant: ';
    
    return prompt;
  }

  /**
   * Categorize HTTP errors for better user feedback
   */
  categorizeHttpError(status, statusText) {
    const isRemote = this.isRemoteConnection();
    
    switch (status) {
      case 404:
        return {
          errorType: 'model',
          errorMessage: this.chatConfig.fallbackMessages.modelNotFound
        };
      case 401:
        return {
          errorType: 'auth',
          errorMessage: this.chatConfig.fallbackMessages.authenticationFailed
        };
      case 403:
        return {
          errorType: 'auth',
          errorMessage: this.chatConfig.fallbackMessages.accessDenied
        };
      case 500:
      case 502:
      case 503:
        return {
          errorType: 'server',
          errorMessage: isRemote 
            ? this.chatConfig.fallbackMessages.remoteServiceUnavailable
            : this.chatConfig.fallbackMessages.serviceOffline
        };
      case 504:
        return {
          errorType: 'timeout',
          errorMessage: isRemote
            ? this.chatConfig.fallbackMessages.remoteTimeout
            : this.chatConfig.fallbackMessages.timeout
        };
      default:
        return {
          errorType: 'connection',
          errorMessage: isRemote
            ? this.chatConfig.fallbackMessages.remoteServiceUnavailable
            : this.chatConfig.fallbackMessages.connectionError
        };
    }
  }

  /**
   * Categorize connection errors for better user feedback
   */
  categorizeConnectionError(error) {
    const isRemote = this.isRemoteConnection();
    
    // Timeout errors
    if (error.name === 'AbortError') {
      return {
        errorType: 'timeout',
        errorMessage: isRemote
          ? this.chatConfig.fallbackMessages.remoteTimeout
          : this.chatConfig.fallbackMessages.timeout
      };
    }
    
    // CORS errors - enhanced detection
    if (this.isCorsError(error)) {
      const corsMessage = this.networkConfig.useProxy && this.networkConfig.corsProxy
        ? "CORS error occurred even with proxy. Please check proxy configuration."
        : isRemote 
          ? "CORS error: The remote Ollama server needs to be configured to allow requests from this domain. " +
            "Please set OLLAMA_ORIGINS environment variable on your PC."
          : this.chatConfig.fallbackMessages.corsError;
      
      return {
        errorType: 'cors',
        errorMessage: corsMessage
      };
    }
    
    // Network/fetch errors
    if (error.message.includes('fetch') || 
        error.message.includes('NetworkError') ||
        error.message.includes('Failed to fetch')) {
      
      if (isRemote) {
        // For remote connections, network errors could be various issues
        if (error.message.includes('refused') || error.message.includes('ECONNREFUSED')) {
          return {
            errorType: 'connection',
            errorMessage: this.chatConfig.fallbackMessages.remoteConnectionRefused
          };
        }
        return {
          errorType: 'network',
          errorMessage: this.chatConfig.fallbackMessages.remoteServiceUnavailable
        };
      } else {
        // For local connections, it's likely Ollama not running
        return {
          errorType: 'connection',
          errorMessage: this.chatConfig.fallbackMessages.localServiceNotRunning
        };
      }
    }
    
    // Connection refused errors
    if (error.message.includes('refused') || error.message.includes('ECONNREFUSED')) {
      return {
        errorType: 'connection',
        errorMessage: isRemote
          ? this.chatConfig.fallbackMessages.remoteConnectionRefused
          : this.chatConfig.fallbackMessages.localServiceNotRunning
      };
    }
    
    // DNS/hostname errors
    if (error.message.includes('ENOTFOUND') || 
        error.message.includes('getaddrinfo') ||
        error.message.includes('DNS')) {
      return {
        errorType: 'network',
        errorMessage: isRemote
          ? this.chatConfig.fallbackMessages.remoteServiceUnavailable
          : this.chatConfig.fallbackMessages.localConnectionFailed
      };
    }
    
    // SSL/TLS errors
    if (error.message.includes('SSL') || 
        error.message.includes('TLS') ||
        error.message.includes('certificate')) {
      return {
        errorType: 'network',
        errorMessage: 'SSL/TLS connection error. Please check the server certificate.'
      };
    }
    
    // Default categorization
    return {
      errorType: 'connection',
      errorMessage: isRemote
        ? this.chatConfig.fallbackMessages.remoteServiceUnavailable
        : this.chatConfig.fallbackMessages.connectionError
    };
  }

  /**
   * Determine if this is a remote connection (not localhost)
   */
  isRemoteConnection() {
    const url = new URL(this.config.baseUrl);
    const hostname = url.hostname.toLowerCase();
    
    return !(
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    );
  }

  /**
   * Enhanced CORS error detection
   */
  isCorsError(error) {
    // Direct CORS error messages
    if (error.message.includes('CORS') || 
        error.message.includes('Cross-Origin') ||
        error.message.includes('cors')) {
      return true;
    }

    // Network errors that are often CORS-related in browsers
    if (error.message.includes('Failed to fetch') && this.isRemoteConnection()) {
      return true;
    }

    // Type errors that can indicate CORS issues
    if (error instanceof TypeError && 
        error.message.includes('fetch') && 
        this.config.corsMode === 'cors') {
      return true;
    }

    // Check for opaque response (CORS mode: no-cors)
    if (error.message.includes('opaque') || error.message.includes('Response')) {
      return true;
    }

    return false;
  }

  /**
   * Check if proxy is properly configured and accessible
   */
  async checkProxyHealth() {
    if (!this.networkConfig.useProxy || !this.networkConfig.corsProxy) {
      return { healthy: false, error: 'Proxy not configured' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Test proxy with a simple health check
      const response = await fetch(this.networkConfig.corsProxy, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'X-Health-Check': 'true'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return {
        healthy: response.ok,
        status: response.status,
        error: response.ok ? null : `Proxy returned status ${response.status}`
      };

    } catch (error) {
      return {
        healthy: false,
        error: `Proxy health check failed: ${error.message}`
      };
    }
  }

  /**
   * Get CORS headers based on configuration and connection type
   */
  getCorsHeaders() {
    const headers = {};
    const isRemote = this.isRemoteConnection();
    
    // Always set content type for JSON requests
    headers['Content-Type'] = 'application/json';
    headers['Accept'] = 'application/json';
    
    if (this.config.corsMode === 'cors') {
      // For cross-origin requests, add headers that help with CORS
      if (isRemote) {
        // Add headers that help with CORS preflight and caching
        headers['Cache-Control'] = 'no-cache';
        headers['X-Requested-With'] = 'XMLHttpRequest';
        
        // Add custom headers for better CORS handling
        if (this.networkConfig.corsOrigins) {
          headers['Origin'] = window.location.origin;
        }
        
        // Add headers to help identify the request source
        headers['X-Client-Type'] = 'react-chatbot';
        headers['X-Client-Version'] = '1.0.0';
      }
    }
    
    // Add proxy-specific headers if using proxy
    if (this.networkConfig.useProxy) {
      headers['X-Proxy-Request'] = 'true';
      headers['X-Proxy-Target'] = this.config.baseUrl;
    }
    
    return headers;
  }

  /**
   * Make a request with automatic CORS handling and proxy fallback
   */
  async makeRequest(endpoint, options = {}) {
    const targetUrl = `${this.config.baseUrl}${endpoint}`;
    const isRemote = this.isRemoteConnection();
    
    // If proxy is explicitly enabled, use proxy service
    if (this.networkConfig.useProxy) {
      console.log('Using configured proxy for request to:', targetUrl);
      return await this.corsProxyService.makeRequest(targetUrl, options);
    }
    
    // Try direct request first
    try {
      const requestOptions = {
        ...options,
        mode: this.config.corsMode,
        credentials: this.config.corsMode === 'cors' 
          ? (this.networkConfig.corsCredentials ? 'include' : 'omit')
          : 'same-origin'
      };
      
      // Add CORS-specific options for remote connections
      if (isRemote && this.config.corsMode === 'cors') {
        requestOptions.referrerPolicy = 'strict-origin-when-cross-origin';
        requestOptions.cache = 'no-cache';
      }
      
      console.log(`Making ${requestOptions.mode} request to:`, targetUrl);
      const response = await fetch(targetUrl, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.warn('Direct request failed:', error.message);
      
      // If direct request fails with CORS error and we're in remote mode,
      // automatically try proxy as fallback (if proxy is available)
      if (this.isCorsError(error) && isRemote && this.networkConfig.corsProxy) {
        console.warn('CORS error detected, attempting proxy fallback...');
        try {
          return await this.corsProxyService.makeRequest(targetUrl, options);
        } catch (proxyError) {
          console.error('Proxy fallback also failed:', proxyError.message);
          // Throw the original CORS error with additional context
          throw new OllamaConnectionError(
            `Direct request failed due to CORS (${error.message}), and proxy fallback also failed (${proxyError.message})`,
            'cors',
            error
          );
        }
      }
      
      throw error;
    }
  }

  /**
   * Get fetch options for requests based on configuration
   */
  getFetchOptions(method = 'GET', body = null, signal = null) {
    const isRemote = this.isRemoteConnection();
    const options = {
      method,
      mode: this.config.corsMode,
      signal
    };

    // Set credentials based on CORS mode, connection type, and configuration
    if (this.config.corsMode === 'cors') {
      // For cross-origin requests, respect the corsCredentials setting
      options.credentials = this.networkConfig.corsCredentials ? 'include' : 'omit';
    } else {
      // For same-origin requests, include credentials by default
      options.credentials = 'same-origin';
    }

    // Add headers
    options.headers = {
      ...this.getCorsHeaders()
    };

    // Add body if provided
    if (body) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
    }

    // Special handling for proxy requests
    if (this.networkConfig.useProxy && this.networkConfig.corsProxy) {
      // When using proxy, we always use CORS mode
      options.mode = 'cors';
      options.credentials = 'omit'; // Proxies typically don't forward credentials
      
      // Add proxy-specific headers
      options.headers['X-Requested-With'] = 'XMLHttpRequest';
      options.headers['X-Proxy-Request'] = 'true';
    }

    // Add CORS-specific options for remote connections
    if (isRemote && this.config.corsMode === 'cors') {
      // Add referrer policy for better security
      options.referrerPolicy = 'strict-origin-when-cross-origin';
      
      // Add cache control for CORS requests
      options.cache = 'no-cache';
    }

    return options;
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkConnection();
      } catch (error) {
        console.warn('Health check failed:', error.message);
      }
    }, this.networkConfig.healthCheckInterval);
    
    // Initial health check
    setTimeout(() => {
      this.checkConnection().catch(error => {
        console.warn('Initial health check failed:', error.message);
      });
    }, 1000);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Cleanup network reliability manager
    if (this.networkReliabilityManager) {
      this.networkReliabilityManager.cleanup();
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    return { ...this.connectionStatus };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart health monitoring if interval changed
    if (newConfig.healthCheckInterval !== undefined) {
      this.startHealthMonitoring();
    }
  }

  /**
   * List available models
   */
  async listModels() {
    try {
      await this.checkConnection();
      return this.connectionStatus.availableModels;
    } catch (error) {
      throw new OllamaConnectionError(
        'Failed to retrieve available models',
        'connection',
        error
      );
    }
  }

  /**
   * Switch to a different model
   */
  async switchModel(modelName) {
    const availableModels = await this.listModels();
    
    if (!availableModels.includes(modelName)) {
      throw new OllamaConnectionError(
        `Model '${modelName}' is not available. Available models: ${availableModels.join(', ')}`,
        'model'
      );
    }
    
    this.config.model = modelName;
    this.connectionStatus.currentModel = modelName;
    
    console.log(`Switched to model: ${modelName}`);
  }

  /**
   * Get fallback response when Ollama is completely unreachable
   */
  getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Basic keyword-based responses for common queries
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('value') || lowerMessage.includes('worth')) {
      return "I'd be happy to help with pricing information, but I need to connect to our AI service first. " +
             "For immediate assistance with car valuations, please contact us directly at [phone] or email [email]. " +
             "We typically provide free quotes within 24 hours.";
    }
    
    if (lowerMessage.includes('damage') || lowerMessage.includes('assess') || lowerMessage.includes('condition')) {
      return "For car damage assessments, our team can help evaluate your vehicle's condition. " +
             "While our AI assistant is temporarily unavailable, you can still get a quote by contacting us directly. " +
             "We assess all types of damage including accident damage, hail damage, and mechanical issues.";
    }
    
    if (lowerMessage.includes('sell') || lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
      return "We'd love to help you sell your damaged car! Even though our AI assistant is currently offline, " +
             "our team is still available to provide quotes and assistance. We buy cars in any condition throughout New Zealand. " +
             "Contact us at [phone] for immediate assistance.";
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help')) {
      return "Hello! I'm currently running in limited mode due to a temporary service issue. " +
             "While I can't provide detailed AI-powered responses right now, I can still help with basic information about our car buying service. " +
             "For immediate assistance, please contact our team directly.";
    }
    
    // Default fallback response
    return this.chatConfig.fallbackMessages.fallbackMode + " " +
           "For immediate assistance with your damaged car, please contact us directly at [phone] or visit our website for more information.";
  }

  /**
   * Send message with graceful degradation
   */
  async sendMessageWithFallback(message, conversationHistory = []) {
    try {
      return await this.sendMessage(message, conversationHistory);
    } catch (error) {
      console.warn('Primary AI service failed, using fallback response:', error.message);
      
      // Check if this is a complete service failure
      if (error instanceof OllamaConnectionError && 
          ['connection', 'network', 'timeout'].includes(error.type)) {
        
        // Return a contextual fallback response
        return this.getFallbackResponse(message);
      }
      
      // For other errors, re-throw to let the UI handle them
      throw error;
    }
  }

  /**
   * Send streaming message with graceful degradation
   */
  async sendMessageStreamWithFallback(message, conversationHistory = [], onChunk) {
    try {
      return await this.sendMessageStream(message, conversationHistory, onChunk);
    } catch (error) {
      console.warn('Primary AI service failed, using fallback response:', error.message);
      
      // Check if this is a complete service failure
      if (error instanceof OllamaConnectionError && 
          ['connection', 'network', 'timeout'].includes(error.type)) {
        
        // Simulate streaming for fallback response
        const fallbackResponse = this.getFallbackResponse(message);
        
        if (onChunk) {
          // Simulate typing effect for fallback
          const words = fallbackResponse.split(' ');
          let currentResponse = '';
          
          for (let i = 0; i < words.length; i++) {
            currentResponse += (i > 0 ? ' ' : '') + words[i];
            onChunk(words[i] + (i < words.length - 1 ? ' ' : ''), currentResponse);
            
            // Small delay to simulate typing
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        return fallbackResponse;
      }
      
      // For other errors, re-throw to let the UI handle them
      throw error;
    }
  }

  /**
   * Check if service is in degraded mode
   */
  isDegraded() {
    return this.connectionStatus.status === 'error' || 
           this.connectionStatus.status === 'disconnected';
  }

  /**
   * Get service status for UI display
   */
  getServiceStatus() {
    if (this.connectionStatus.status === 'connected') {
      return {
        mode: 'normal',
        message: 'AI assistant is fully operational',
        canUseAI: true
      };
    } else if (this.connectionStatus.status === 'connecting') {
      return {
        mode: 'connecting',
        message: 'Connecting to AI service...',
        canUseAI: false
      };
    } else {
      return {
        mode: 'degraded',
        message: 'AI assistant is in limited mode - basic responses available',
        canUseAI: false
      };
    }
  }

  /**
   * Get network reliability manager for UI components
   */
  getNetworkReliabilityManager() {
    return this.networkReliabilityManager;
  }

  /**
   * Get connection quality information
   */
  getConnectionQuality() {
    return this.networkReliabilityManager.getConnectionQuality();
  }

  /**
   * Get network statistics
   */
  getNetworkStatistics() {
    return this.networkReliabilityManager.getStatistics();
  }

  /**
   * Get request queue status
   */
  getRequestQueueStatus() {
    return this.networkReliabilityManager.getQueueStatus();
  }

  /**
   * Clear request queue (useful for connection recovery)
   */
  clearRequestQueue(reason = 'Queue cleared by user') {
    this.networkReliabilityManager.clearQueue(reason);
  }

  /**
   * Get CORS configuration status and recommendations
   */
  getCorsStatus() {
    const isRemote = this.isRemoteConnection();
    const hasProxy = this.networkConfig.useProxy && this.networkConfig.corsProxy;
    
    const status = {
      connectionType: isRemote ? 'remote' : 'local',
      corsMode: this.config.corsMode,
      proxyEnabled: this.networkConfig.useProxy,
      proxyConfigured: !!this.networkConfig.corsProxy,
      recommendations: []
    };
    
    // Add recommendations based on configuration
    if (isRemote && this.config.corsMode === 'no-cors') {
      status.recommendations.push({
        type: 'config',
        message: 'Remote connection detected but CORS mode is no-cors',
        action: 'Set REACT_APP_CORS_MODE=cors for remote connections'
      });
    }
    
    if (isRemote && !hasProxy) {
      status.recommendations.push({
        type: 'setup',
        message: 'Remote connection without proxy may fail due to CORS',
        action: 'Configure Ollama with OLLAMA_ORIGINS or set up a CORS proxy'
      });
    }
    
    if (this.networkConfig.useProxy && !this.networkConfig.corsProxy) {
      status.recommendations.push({
        type: 'config',
        message: 'Proxy enabled but no proxy URL configured',
        action: 'Set REACT_APP_CORS_PROXY environment variable'
      });
    }
    
    // Add proxy service recommendations
    status.recommendations.push(...this.corsProxyService.getProxyRecommendations());
    
    return status;
  }

  /**
   * Test CORS configuration
   */
  async testCorsConfiguration() {
    const results = {
      direct: null,
      proxy: null,
      recommendations: [],
      configuration: this.getCorsConfigurationSummary()
    };
    
    // Test direct connection
    try {
      await this.checkConnection();
      results.direct = {
        success: true,
        message: 'Direct connection successful',
        corsMode: this.config.corsMode,
        connectionType: this.isRemoteConnection() ? 'remote' : 'local'
      };
    } catch (error) {
      results.direct = {
        success: false,
        error: error.message,
        isCorsError: this.isCorsError(error),
        corsMode: this.config.corsMode,
        connectionType: this.isRemoteConnection() ? 'remote' : 'local'
      };
    }
    
    // Test proxy if configured
    if (this.networkConfig.corsProxy) {
      results.proxy = await this.corsProxyService.testProxy(this.networkConfig.corsProxy);
    }
    
    // Generate recommendations based on test results
    if (!results.direct.success && results.direct.isCorsError) {
      const isRemote = this.isRemoteConnection();
      
      if (isRemote) {
        results.recommendations.push({
          type: 'cors',
          priority: 'high',
          message: 'Direct connection failed due to CORS policy',
          action: 'Configure Ollama server with OLLAMA_ORIGINS environment variable',
          example: `OLLAMA_ORIGINS="${window.location.origin}"`
        });
        
        if (!this.networkConfig.corsProxy) {
          results.recommendations.push({
            type: 'proxy',
            priority: 'medium',
            message: 'Consider setting up a CORS proxy as fallback',
            action: 'Set REACT_APP_CORS_PROXY environment variable',
            example: 'REACT_APP_CORS_PROXY=https://your-proxy.com'
          });
        }
      } else {
        results.recommendations.push({
          type: 'config',
          priority: 'medium',
          message: 'Local connection failed with CORS error',
          action: 'Check if CORS mode should be "no-cors" for localhost',
          example: 'REACT_APP_CORS_MODE=no-cors'
        });
      }
    }
    
    if (results.proxy && !results.proxy.success) {
      results.recommendations.push({
        type: 'proxy',
        priority: 'high',
        message: 'Configured proxy is not working',
        action: 'Check proxy URL and ensure it supports CORS',
        example: 'Verify REACT_APP_CORS_PROXY is accessible'
      });
    }
    
    // Add configuration-specific recommendations
    results.recommendations.push(...this.getCorsConfigurationRecommendations());
    
    return results;
  }

  /**
   * Get CORS configuration summary
   */
  getCorsConfigurationSummary() {
    const isRemote = this.isRemoteConnection();
    
    return {
      connectionType: isRemote ? 'remote' : 'local',
      corsMode: this.config.corsMode,
      useProxy: this.networkConfig.useProxy,
      proxyConfigured: !!this.networkConfig.corsProxy,
      corsCredentials: this.networkConfig.corsCredentials,
      corsOrigins: this.networkConfig.corsOrigins,
      baseUrl: this.config.baseUrl,
      environment: process.env.NODE_ENV
    };
  }

  /**
   * Get CORS configuration recommendations
   */
  getCorsConfigurationRecommendations() {
    const recommendations = [];
    const isRemote = this.isRemoteConnection();
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Check CORS mode appropriateness
    if (isRemote && this.config.corsMode === 'no-cors') {
      recommendations.push({
        type: 'config',
        priority: 'high',
        message: 'Remote connection detected but CORS mode is "no-cors"',
        action: 'Change CORS mode to "cors" for remote connections',
        example: 'REACT_APP_CORS_MODE=cors'
      });
    }
    
    if (!isRemote && this.config.corsMode === 'cors') {
      recommendations.push({
        type: 'optimization',
        priority: 'low',
        message: 'Local connection using CORS mode (not required)',
        action: 'Consider using "no-cors" for localhost connections',
        example: 'REACT_APP_CORS_MODE=no-cors'
      });
    }
    
    // Check proxy configuration
    if (isRemote && !this.networkConfig.corsProxy && !this.networkConfig.corsOrigins) {
      recommendations.push({
        type: 'setup',
        priority: 'medium',
        message: 'Remote connection without CORS configuration',
        action: 'Configure Ollama CORS origins or set up a proxy',
        example: 'OLLAMA_ORIGINS="https://your-app.vercel.app" or REACT_APP_CORS_PROXY=...'
      });
    }
    
    // Check production configuration
    if (isProduction && !isRemote) {
      recommendations.push({
        type: 'deployment',
        priority: 'medium',
        message: 'Production environment using localhost URL',
        action: 'Set remote Ollama URL for production deployment',
        example: 'REACT_APP_OLLAMA_URL=https://your-ollama-server.com'
      });
    }
    
    // Check credentials configuration
    if (this.networkConfig.corsCredentials && isRemote) {
      recommendations.push({
        type: 'security',
        priority: 'medium',
        message: 'CORS credentials enabled for remote connection',
        action: 'Ensure this is necessary for your setup',
        example: 'Set REACT_APP_CORS_CREDENTIALS=false if not needed'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate CORS setup instructions
   */
  generateCorsSetupInstructions() {
    const isRemote = this.isRemoteConnection();
    const instructions = {
      connectionType: isRemote ? 'remote' : 'local',
      steps: []
    };
    
    if (isRemote) {
      instructions.steps = [
        {
          step: 1,
          title: 'Configure Ollama CORS Origins',
          description: 'Set the OLLAMA_ORIGINS environment variable on your PC',
          command: `export OLLAMA_ORIGINS="${window.location.origin}"`,
          note: 'This allows your deployed app to make requests to Ollama'
        },
        {
          step: 2,
          title: 'Restart Ollama Service',
          description: 'Restart Ollama to apply the new CORS configuration',
          command: 'ollama serve',
          note: 'The service needs to restart to pick up environment changes'
        },
        {
          step: 3,
          title: 'Verify Network Access',
          description: 'Ensure Ollama is accessible from the internet',
          command: `curl -X GET ${this.config.baseUrl}/api/tags`,
          note: 'This should return a list of available models'
        },
        {
          step: 4,
          title: 'Test Connection',
          description: 'Use the connection test feature to verify setup',
          action: 'Click "Test Connection" in the chatbot interface',
          note: 'This will verify both direct and proxy connections'
        }
      ];
      
      if (this.networkConfig.corsProxy) {
        instructions.steps.push({
          step: 5,
          title: 'Proxy Fallback Configured',
          description: 'Proxy is configured as fallback option',
          note: `Proxy URL: ${this.networkConfig.corsProxy}`
        });
      }
    } else {
      instructions.steps = [
        {
          step: 1,
          title: 'Start Ollama Locally',
          description: 'Ensure Ollama is running on your local machine',
          command: 'ollama serve',
          note: 'Default address is localhost:11434'
        },
        {
          step: 2,
          title: 'Verify Local Connection',
          description: 'Test that Ollama is accessible locally',
          command: 'curl -X GET http://localhost:11434/api/tags',
          note: 'Should return available models'
        }
      ];
    }
    
    return instructions;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopHealthMonitoring();
  }
}

/**
 * Enhanced Retry Handler with Smart Error Categorization
 */
class RetryHandler {
  constructor(maxRetries = 3, chatConfig = null) {
    this.maxRetries = maxRetries;
    this.chatConfig = chatConfig;
  }

  /**
   * Determine if an error should be retried
   */
  shouldRetry(error, attempt) {
    if (attempt >= this.maxRetries) {
      return false;
    }
    
    if (error instanceof OllamaConnectionError) {
      // Never retry these error types
      const nonRetryableErrors = ['model', 'cors', 'auth'];
      if (nonRetryableErrors.includes(error.type)) {
        return false;
      }
      
      // Retry network and timeout errors
      const retryableErrors = ['network', 'timeout', 'connection', 'server'];
      return retryableErrors.includes(error.type);
    }
    
    // Retry unknown errors (but limit attempts)
    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateDelay(attempt, errorType) {
    // Base delay varies by error type
    let baseDelay;
    switch (errorType) {
      case 'timeout':
        baseDelay = 2000; // Longer delay for timeout errors
        break;
      case 'network':
        baseDelay = 1500; // Medium delay for network errors
        break;
      case 'server':
        baseDelay = 3000; // Longer delay for server errors
        break;
      default:
        baseDelay = 1000; // Default delay
    }
    
    // Exponential backoff with cap
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), 15000);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.2 * exponentialDelay;
    
    return exponentialDelay + jitter;
  }

  async executeWithRetry(operation) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry this error
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
        
        // Calculate delay based on error type
        const errorType = error instanceof OllamaConnectionError ? error.type : 'unknown';
        const delay = this.calculateDelay(attempt, errorType);
        
        console.warn(`Attempt ${attempt}/${this.maxRetries} failed (${errorType}), retrying in ${Math.round(delay)}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we've exhausted retries, throw a more informative error
    if (lastError instanceof OllamaConnectionError) {
      throw new OllamaConnectionError(
        this.chatConfig?.fallbackMessages?.retryExhausted || 
        `Failed after ${this.maxRetries} attempts: ${lastError.message}`,
        lastError.type,
        lastError
      );
    }
    
    throw lastError;
  }
}

export { OllamaService, OllamaConnectionError };
export default OllamaService;