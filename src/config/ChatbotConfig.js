/**
 * Chatbot Configuration Manager
 * Handles environment-specific configuration for Ollama integration
 * Supports both local development and production deployment scenarios
 */

class ConfigurationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ConfigurationError';
    this.field = field;
  }
}

class ChatbotConfig {
  constructor() {
    this.config = null;
    this.validationErrors = [];
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize configuration
    this.loadConfiguration();
  }

  /**
   * Load and validate configuration from environment variables
   */
  loadConfiguration() {
    try {
      this.config = this.buildConfiguration();
      this.validateConfiguration();
      
      if (this.validationErrors.length > 0) {
        throw new ConfigurationError(
          `Configuration validation failed: ${this.validationErrors.join(', ')}`,
          'validation'
        );
      }
      
      console.log('Chatbot configuration loaded successfully:', {
        environment: this.isProduction ? 'production' : 'development',
        ollamaUrl: this.config.ollama.baseUrl,
        model: this.config.ollama.model,
        corsMode: this.config.ollama.corsMode
      });
      
    } catch (error) {
      console.error('Failed to load chatbot configuration:', error);
      throw error;
    }
  }

  /**
   * Build configuration object from environment variables with fallbacks
   */
  buildConfiguration() {
    return {
      ollama: {
        baseUrl: this.getOllamaUrl(),
        model: this.getOllamaModel(),
        timeout: this.getTimeout(),
        retryAttempts: this.getRetryAttempts(),
        corsMode: this.getCorsMode(),
        parameters: {
          temperature: this.getFloatEnv('REACT_APP_OLLAMA_TEMPERATURE', 0.7),
          max_tokens: this.getIntEnv('REACT_APP_OLLAMA_MAX_TOKENS', 2048),
          top_p: this.getFloatEnv('REACT_APP_OLLAMA_TOP_P', 0.9)
        }
      },
      chat: {
        maxHistoryLength: this.getIntEnv('REACT_APP_CHAT_MAX_HISTORY', 10),
        systemPrompt: this.getSystemPrompt(),
        fallbackMessages: {
          // Connection-related errors
          connectionError: "I'm having trouble connecting to our AI service. Please try again in a moment.",
          timeout: "The AI service is taking longer than expected. Please try again.",
          modelNotFound: "The AI model is temporarily unavailable. Please try again later.",
          serviceOffline: "Our AI assistant is currently offline. Please try again later.",
          
          // Remote connection specific errors
          corsError: "There's a CORS configuration issue preventing connection to the remote AI service. Please contact support.",
          networkError: "Network connection failed. Please check your internet connection and try again.",
          remoteServiceUnavailable: "The remote AI service is currently unavailable. The service may be offline or unreachable.",
          remoteTimeout: "The remote AI service is taking too long to respond. This may be due to network latency or service load.",
          remoteConnectionRefused: "Connection to the remote AI service was refused. The service may not be running or accessible.",
          
          // Local connection specific errors
          localServiceNotRunning: "The local AI service (Ollama) is not running. Please start Ollama and try again.",
          localConnectionFailed: "Failed to connect to the local AI service. Please check if Ollama is running on localhost:11434.",
          
          // Authentication and authorization errors
          authenticationFailed: "Authentication with the AI service failed. Please check your credentials.",
          accessDenied: "Access to the AI service was denied. Please check your permissions.",
          
          // Model-specific errors
          modelLoadingFailed: "The AI model failed to load. Please try again or contact support.",
          modelNotSupported: "The requested AI model is not supported by this service.",
          
          // Graceful degradation messages
          fallbackMode: "I'm currently running in limited mode due to AI service issues. I can still help with basic questions about our car buying service.",
          maintenanceMode: "Our AI assistant is temporarily under maintenance. Please try again later or contact us directly.",
          
          // Generic fallbacks
          unknownError: "An unexpected error occurred. Please try again or contact support if the problem persists.",
          retryExhausted: "I've tried multiple times but can't connect to the AI service. Please try again later."
        }
      },
      ui: {
        showConnectionStatus: this.getBooleanEnv('REACT_APP_SHOW_CONNECTION_STATUS', true),
        enableModelSelection: this.getBooleanEnv('REACT_APP_ENABLE_MODEL_SELECTION', false),
        typingIndicatorDelay: this.getIntEnv('REACT_APP_TYPING_DELAY', 500),
        maxRetryAttempts: this.getIntEnv('REACT_APP_MAX_RETRY_ATTEMPTS', 3),
        retryDelay: this.getIntEnv('REACT_APP_RETRY_DELAY', 2000)
      },
      network: {
        healthCheckInterval: this.getIntEnv('REACT_APP_HEALTH_CHECK_INTERVAL', 30000),
        corsProxy: process.env.REACT_APP_CORS_PROXY || null,
        useProxy: this.getBooleanEnv('REACT_APP_USE_PROXY', false),
        corsOrigins: process.env.REACT_APP_CORS_ORIGINS || null,
        corsCredentials: this.getBooleanEnv('REACT_APP_CORS_CREDENTIALS', false),
        corsMaxAge: this.getIntEnv('REACT_APP_CORS_MAX_AGE', 86400),
        proxyTimeout: this.getIntEnv('REACT_APP_PROXY_TIMEOUT', 30000),
        
        // Network reliability settings
        maxQueueSize: this.getIntEnv('REACT_APP_MAX_QUEUE_SIZE', 10),
        connectionQualityWindow: this.getIntEnv('REACT_APP_CONNECTION_QUALITY_WINDOW', 5),
        slowConnectionThreshold: this.getIntEnv('REACT_APP_SLOW_CONNECTION_THRESHOLD', 5000),
        verySlowConnectionThreshold: this.getIntEnv('REACT_APP_VERY_SLOW_CONNECTION_THRESHOLD', 10000),
        queueProcessingInterval: this.getIntEnv('REACT_APP_QUEUE_PROCESSING_INTERVAL', 1000),
        timeoutGracePeriod: this.getIntEnv('REACT_APP_TIMEOUT_GRACE_PERIOD', 2000),
        showConnectionQuality: this.getBooleanEnv('REACT_APP_SHOW_CONNECTION_QUALITY', true),
        showTimeoutProgress: this.getBooleanEnv('REACT_APP_SHOW_TIMEOUT_PROGRESS', true)
      }
    };
  }

  /**
   * Get Ollama URL with environment-specific defaults
   */
  getOllamaUrl() {
    const envUrl = process.env.REACT_APP_OLLAMA_URL;
    
    if (envUrl) {
      return envUrl;
    }
    
    // Default URLs based on environment
    if (this.isProduction) {
      // In production, we expect the URL to be explicitly set
      this.validationErrors.push('REACT_APP_OLLAMA_URL is required in production environment');
      return null;
    } else {
      // Development default
      return 'http://localhost:11434';
    }
  }

  /**
   * Get Ollama model name with fallback
   */
  getOllamaModel() {
    return process.env.REACT_APP_OLLAMA_MODEL || 'mistral-nz-cars';
  }

  /**
   * Get timeout value with environment-specific defaults
   */
  getTimeout() {
    const defaultTimeout = this.isProduction ? 45000 : 30000; // Longer timeout for remote connections
    return this.getIntEnv('REACT_APP_OLLAMA_TIMEOUT', defaultTimeout);
  }

  /**
   * Get retry attempts with fallback
   */
  getRetryAttempts() {
    return this.getIntEnv('REACT_APP_OLLAMA_RETRY_ATTEMPTS', 3);
  }

  /**
   * Get CORS mode based on environment
   */
  getCorsMode() {
    const envCorsMode = process.env.REACT_APP_CORS_MODE;
    
    if (envCorsMode) {
      if (!['cors', 'no-cors', 'same-origin'].includes(envCorsMode)) {
        this.validationErrors.push('REACT_APP_CORS_MODE must be one of: cors, no-cors, same-origin');
        return 'cors';
      }
      return envCorsMode;
    }
    
    // Default CORS mode based on environment
    return this.isProduction ? 'cors' : 'no-cors';
  }

  /**
   * Get system prompt with fallback
   */
  getSystemPrompt() {
    return process.env.REACT_APP_SYSTEM_PROMPT || 
      "You are a helpful car buying assistant for a New Zealand car buying service. " +
      "The user is looking to sell their damaged car. Keep your responses concise but helpful. " +
      "Focus on car damage assessment, pricing guidance, and the car buying process.";
  }

  /**
   * Helper method to get integer environment variables with fallback
   */
  getIntEnv(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      this.validationErrors.push(`${key} must be a valid integer, got: ${value}`);
      return defaultValue;
    }
    
    return parsed;
  }

  /**
   * Helper method to get float environment variables with fallback
   */
  getFloatEnv(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      this.validationErrors.push(`${key} must be a valid number, got: ${value}`);
      return defaultValue;
    }
    
    return parsed;
  }

  /**
   * Helper method to get boolean environment variables with fallback
   */
  getBooleanEnv(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    
    const lowerValue = value.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
      return true;
    } else if (['false', '0', 'no', 'off'].includes(lowerValue)) {
      return false;
    } else {
      this.validationErrors.push(`${key} must be a boolean value (true/false), got: ${value}`);
      return defaultValue;
    }
  }

  /**
   * Validate the configuration
   */
  validateConfiguration() {
    const { ollama, chat, ui, network } = this.config;

    // Validate Ollama URL
    if (!ollama.baseUrl) {
      this.validationErrors.push('Ollama base URL is required');
    } else {
      try {
        new URL(ollama.baseUrl);
      } catch (error) {
        this.validationErrors.push(`Invalid Ollama URL format: ${ollama.baseUrl}`);
      }
    }

    // Validate model name
    if (!ollama.model || ollama.model.trim() === '') {
      this.validationErrors.push('Ollama model name is required');
    }

    // Validate timeout
    if (ollama.timeout < 1000) {
      this.validationErrors.push('Timeout must be at least 1000ms');
    }

    // Validate retry attempts
    if (ollama.retryAttempts < 0 || ollama.retryAttempts > 10) {
      this.validationErrors.push('Retry attempts must be between 0 and 10');
    }

    // Validate temperature
    if (ollama.parameters.temperature < 0 || ollama.parameters.temperature > 2) {
      this.validationErrors.push('Temperature must be between 0 and 2');
    }

    // Validate max_tokens
    if (ollama.parameters.max_tokens < 1 || ollama.parameters.max_tokens > 8192) {
      this.validationErrors.push('Max tokens must be between 1 and 8192');
    }

    // Validate top_p
    if (ollama.parameters.top_p < 0 || ollama.parameters.top_p > 1) {
      this.validationErrors.push('Top_p must be between 0 and 1');
    }

    // Validate chat history length
    if (chat.maxHistoryLength < 1 || chat.maxHistoryLength > 50) {
      this.validationErrors.push('Max history length must be between 1 and 50');
    }

    // Validate UI delays
    if (ui.typingIndicatorDelay < 0) {
      this.validationErrors.push('Typing indicator delay must be non-negative');
    }

    if (ui.retryDelay < 100) {
      this.validationErrors.push('Retry delay must be at least 100ms');
    }

    // Validate health check interval (0 means disabled)
    if (network.healthCheckInterval !== 0 && network.healthCheckInterval < 5000) {
      this.validationErrors.push('Health check interval must be 0 (disabled) or at least 5000ms');
    }

    // Validate CORS proxy URL if provided
    if (network.corsProxy) {
      try {
        new URL(network.corsProxy);
      } catch (error) {
        this.validationErrors.push(`Invalid CORS proxy URL format: ${network.corsProxy}`);
      }
    }

    // Validate CORS origins format if provided
    if (network.corsOrigins) {
      const origins = network.corsOrigins.split(',').map(o => o.trim());
      for (const origin of origins) {
        if (origin !== '*' && origin !== 'null') {
          try {
            new URL(origin);
          } catch (error) {
            this.validationErrors.push(`Invalid CORS origin format: ${origin}`);
          }
        }
      }
    }

    // Validate proxy timeout
    if (network.proxyTimeout < 1000) {
      this.validationErrors.push('Proxy timeout must be at least 1000ms');
    }

    // Validate CORS max age
    if (network.corsMaxAge < 0) {
      this.validationErrors.push('CORS max age must be non-negative');
    }
  }

  /**
   * Get the current configuration
   */
  getConfig() {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded. Call loadConfiguration() first.');
    }
    return this.config;
  }

  /**
   * Get a specific configuration section
   */
  getOllamaConfig() {
    return this.getConfig().ollama;
  }

  getChatConfig() {
    return this.getConfig().chat;
  }

  getUIConfig() {
    return this.getConfig().ui;
  }

  getNetworkConfig() {
    return this.getConfig().network;
  }

  /**
   * Update configuration at runtime (useful for testing or dynamic updates)
   */
  updateConfig(updates) {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded. Call loadConfiguration() first.');
    }

    // Deep merge the updates
    this.config = this.deepMerge(this.config, updates);
    
    // Re-validate after update
    this.validationErrors = [];
    this.validateConfiguration();
    
    if (this.validationErrors.length > 0) {
      throw new ConfigurationError(
        `Configuration update validation failed: ${this.validationErrors.join(', ')}`,
        'validation'
      );
    }

    console.log('Configuration updated successfully');
  }

  /**
   * Deep merge utility for configuration updates
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary() {
    if (!this.config) {
      return 'Configuration not loaded';
    }

    return {
      environment: this.isProduction ? 'production' : 'development',
      ollamaUrl: this.config.ollama.baseUrl,
      model: this.config.ollama.model,
      timeout: this.config.ollama.timeout,
      corsMode: this.config.ollama.corsMode,
      useProxy: this.config.network.useProxy,
      corsProxy: this.config.network.corsProxy,
      corsOrigins: this.config.network.corsOrigins,
      showConnectionStatus: this.config.ui.showConnectionStatus
    };
  }

  /**
   * Check if configuration is valid
   */
  isValid() {
    return this.config !== null && this.validationErrors.length === 0;
  }

  /**
   * Get validation errors
   */
  getValidationErrors() {
    return [...this.validationErrors];
  }

  /**
   * Get CORS configuration recommendations based on current setup
   */
  getCorsRecommendations() {
    if (!this.config) {
      return [];
    }

    const recommendations = [];
    const { ollama, network } = this.config;
    const isRemote = this.isRemoteUrl(ollama.baseUrl);
    const isProduction = this.isProduction;

    // Check CORS mode appropriateness
    if (isRemote && ollama.corsMode === 'no-cors') {
      recommendations.push({
        type: 'cors-mode',
        severity: 'error',
        message: 'Remote Ollama URL detected but CORS mode is "no-cors"',
        suggestion: 'Set REACT_APP_CORS_MODE=cors for remote connections',
        impact: 'Requests will likely fail due to CORS policy'
      });
    }

    if (!isRemote && ollama.corsMode === 'cors') {
      recommendations.push({
        type: 'cors-mode',
        severity: 'info',
        message: 'Local Ollama URL with CORS mode (not required)',
        suggestion: 'Consider REACT_APP_CORS_MODE=no-cors for localhost',
        impact: 'No functional impact, but unnecessary overhead'
      });
    }

    // Check proxy configuration
    if (network.useProxy && !network.corsProxy) {
      recommendations.push({
        type: 'proxy-config',
        severity: 'error',
        message: 'Proxy mode enabled but no proxy URL configured',
        suggestion: 'Set REACT_APP_CORS_PROXY or disable proxy with REACT_APP_USE_PROXY=false',
        impact: 'Proxy requests will fail'
      });
    }

    if (isRemote && !network.corsProxy && !network.corsOrigins) {
      recommendations.push({
        type: 'cors-setup',
        severity: 'warning',
        message: 'Remote connection without CORS configuration',
        suggestion: 'Configure OLLAMA_ORIGINS on your PC or set up REACT_APP_CORS_PROXY',
        impact: 'Direct requests may fail due to CORS policy'
      });
    }

    // Check production readiness
    if (isProduction && !isRemote) {
      recommendations.push({
        type: 'deployment',
        severity: 'warning',
        message: 'Production environment using localhost URL',
        suggestion: 'Set REACT_APP_OLLAMA_URL to your remote Ollama server',
        impact: 'Application will not work when deployed'
      });
    }

    if (isProduction && !network.corsProxy && isRemote) {
      recommendations.push({
        type: 'reliability',
        severity: 'info',
        message: 'No proxy fallback configured for production',
        suggestion: 'Consider setting REACT_APP_CORS_PROXY for better reliability',
        impact: 'No fallback if direct CORS fails'
      });
    }

    return recommendations;
  }

  /**
   * Check if a URL is remote (not localhost)
   */
  isRemoteUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      return !(
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate environment variable configuration for different scenarios
   */
  generateEnvConfig(scenario = 'development') {
    const configs = {
      development: {
        REACT_APP_OLLAMA_URL: 'http://localhost:11434',
        REACT_APP_CORS_MODE: 'no-cors',
        REACT_APP_USE_PROXY: 'false',
        REACT_APP_OLLAMA_TIMEOUT: '30000'
      },
      'production-direct': {
        REACT_APP_OLLAMA_URL: 'https://your-ollama-server.com',
        REACT_APP_CORS_MODE: 'cors',
        REACT_APP_USE_PROXY: 'false',
        REACT_APP_OLLAMA_TIMEOUT: '45000',
        REACT_APP_CORS_ORIGINS: 'https://your-app.vercel.app'
      },
      'production-proxy': {
        REACT_APP_OLLAMA_URL: 'https://your-ollama-server.com',
        REACT_APP_CORS_MODE: 'cors',
        REACT_APP_USE_PROXY: 'true',
        REACT_APP_CORS_PROXY: 'https://your-cors-proxy.herokuapp.com',
        REACT_APP_OLLAMA_TIMEOUT: '45000'
      },
      'production-ngrok': {
        REACT_APP_OLLAMA_URL: 'https://abc123.ngrok.io',
        REACT_APP_CORS_MODE: 'cors',
        REACT_APP_USE_PROXY: 'false',
        REACT_APP_OLLAMA_TIMEOUT: '45000'
      }
    };

    return configs[scenario] || configs.development;
  }
}

// Export both the class and a singleton instance
export { ChatbotConfig, ConfigurationError };

// Create and export a singleton instance
const chatbotConfig = new ChatbotConfig();
export default chatbotConfig;