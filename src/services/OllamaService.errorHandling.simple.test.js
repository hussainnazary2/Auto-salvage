/**
 * Simplified tests for enhanced error handling in OllamaService
 * Focuses on the key functionality without complex mocking
 */

import { OllamaService, OllamaConnectionError } from './OllamaService.js';

// Mock the chatbot config
jest.mock('../config/ChatbotConfig.js', () => ({
  getOllamaConfig: () => ({
    baseUrl: 'https://remote-ollama.example.com:11434',
    model: 'test-model',
    timeout: 30000,
    retryAttempts: 3,
    corsMode: 'cors',
    parameters: {
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9
    }
  }),
  getChatConfig: () => ({
    maxHistoryLength: 10,
    systemPrompt: 'Test prompt',
    fallbackMessages: {
      connectionError: "Connection error message",
      timeout: "Timeout error message",
      modelNotFound: "Model not found message",
      serviceOffline: "Service offline message",
      corsError: "CORS error message",
      networkError: "Network error message",
      remoteServiceUnavailable: "Remote service unavailable",
      remoteTimeout: "Remote timeout message",
      remoteConnectionRefused: "Remote connection refused",
      localServiceNotRunning: "Local service not running",
      localConnectionFailed: "Local connection failed",
      authenticationFailed: "Authentication failed",
      accessDenied: "Access denied",
      fallbackMode: "Running in fallback mode",
      retryExhausted: "Retry attempts exhausted"
    }
  }),
  getNetworkConfig: () => ({
    healthCheckInterval: 0, // Disable health checks for tests
    corsProxy: null,
    useProxy: false
  }),
  getUIConfig: () => ({
    showConnectionStatus: true,
    enableModelSelection: false,
    typingIndicatorDelay: 500,
    maxRetryAttempts: 3,
    retryDelay: 2000
  })
}));

// Mock fetch
global.fetch = jest.fn();

describe('OllamaService Enhanced Error Handling - Core Features', () => {
  let service;

  beforeEach(() => {
    service = new OllamaService();
    fetch.mockClear();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Remote vs Local Connection Detection', () => {
    test('should detect remote connections correctly', () => {
      expect(service.isRemoteConnection()).toBe(true);
    });

    test('should detect localhost as local connection', () => {
      // Test the method directly with different URLs
      service.config.baseUrl = 'http://localhost:11434';
      expect(service.isRemoteConnection()).toBe(false);

      service.config.baseUrl = 'http://127.0.0.1:11434';
      expect(service.isRemoteConnection()).toBe(false);

      service.config.baseUrl = 'http://192.168.1.100:11434';
      expect(service.isRemoteConnection()).toBe(false);

      service.config.baseUrl = 'https://example.com:11434';
      expect(service.isRemoteConnection()).toBe(true);
    });
  });

  describe('Error Categorization Methods', () => {
    test('should categorize HTTP errors correctly', () => {
      const result404 = service.categorizeHttpError(404, 'Not Found');
      expect(result404.errorType).toBe('model');
      expect(result404.errorMessage).toBe('Model not found message');

      const result401 = service.categorizeHttpError(401, 'Unauthorized');
      expect(result401.errorType).toBe('auth');
      expect(result401.errorMessage).toBe('Authentication failed');

      const result503 = service.categorizeHttpError(503, 'Service Unavailable');
      expect(result503.errorType).toBe('server');
      expect(result503.errorMessage).toBe('Remote service unavailable');
    });

    test('should categorize connection errors correctly', () => {
      const timeoutError = new Error('AbortError');
      timeoutError.name = 'AbortError';
      const timeoutResult = service.categorizeConnectionError(timeoutError);
      expect(timeoutResult.errorType).toBe('timeout');
      expect(timeoutResult.errorMessage).toBe('Remote timeout message');

      const corsError = new Error('CORS policy blocked the request');
      const corsResult = service.categorizeConnectionError(corsError);
      expect(corsResult.errorType).toBe('cors');
      expect(corsResult.errorMessage).toBe('CORS error message');

      const networkError = new Error('Failed to fetch');
      const networkResult = service.categorizeConnectionError(networkError);
      expect(networkResult.errorType).toBe('network');
      expect(networkResult.errorMessage).toBe('Remote service unavailable');
    });
  });

  describe('Graceful Degradation', () => {
    test('should provide fallback responses for pricing questions', () => {
      const response = service.getFallbackResponse('What is the price of my car?');
      expect(response).toContain('pricing information');
      expect(response).toContain('contact us directly');
    });

    test('should provide fallback responses for damage assessment', () => {
      const response = service.getFallbackResponse('Can you assess my car damage?');
      expect(response).toContain('damage assessments');
      expect(response).toContain('temporarily unavailable');
    });

    test('should provide fallback responses for selling questions', () => {
      const response = service.getFallbackResponse('I want to sell my car');
      expect(response).toContain('sell your damaged car');
      expect(response).toContain('offline');
    });

    test('should provide default fallback for unknown questions', () => {
      const response = service.getFallbackResponse('Random question');
      expect(response).toContain('Running in fallback mode');
    });

    test('should handle pricing questions with "worth" keyword', () => {
      const response = service.getFallbackResponse('What is my car worth?');
      expect(response).toContain('pricing information');
    });
  });

  describe('Service Status', () => {
    test('should return normal status when connected', () => {
      service.connectionStatus.status = 'connected';
      const status = service.getServiceStatus();
      
      expect(status.mode).toBe('normal');
      expect(status.canUseAI).toBe(true);
      expect(status.message).toContain('operational');
    });

    test('should return degraded status when disconnected', () => {
      service.connectionStatus.status = 'error';
      const status = service.getServiceStatus();
      
      expect(status.mode).toBe('degraded');
      expect(status.canUseAI).toBe(false);
      expect(status.message).toContain('limited mode');
    });

    test('should return connecting status when connecting', () => {
      service.connectionStatus.status = 'connecting';
      const status = service.getServiceStatus();
      
      expect(status.mode).toBe('connecting');
      expect(status.canUseAI).toBe(false);
      expect(status.message).toContain('Connecting');
    });

    test('should detect degraded mode correctly', () => {
      service.connectionStatus.status = 'error';
      expect(service.isDegraded()).toBe(true);

      service.connectionStatus.status = 'disconnected';
      expect(service.isDegraded()).toBe(true);

      service.connectionStatus.status = 'connected';
      expect(service.isDegraded()).toBe(false);
    });
  });

  describe('Retry Logic Configuration', () => {
    test('should determine retryable errors correctly', () => {
      const retryHandler = service.retryHandler;

      // Non-retryable errors
      const corsError = new OllamaConnectionError('CORS error', 'cors');
      expect(retryHandler.shouldRetry(corsError, 1)).toBe(false);

      const modelError = new OllamaConnectionError('Model error', 'model');
      expect(retryHandler.shouldRetry(modelError, 1)).toBe(false);

      const authError = new OllamaConnectionError('Auth error', 'auth');
      expect(retryHandler.shouldRetry(authError, 1)).toBe(false);

      // Retryable errors
      const networkError = new OllamaConnectionError('Network error', 'network');
      expect(retryHandler.shouldRetry(networkError, 1)).toBe(true);

      const timeoutError = new OllamaConnectionError('Timeout error', 'timeout');
      expect(retryHandler.shouldRetry(timeoutError, 1)).toBe(true);

      const connectionError = new OllamaConnectionError('Connection error', 'connection');
      expect(retryHandler.shouldRetry(connectionError, 1)).toBe(true);

      // Max attempts reached
      expect(retryHandler.shouldRetry(networkError, 3)).toBe(false);
    });

    test('should calculate delays correctly for different error types', () => {
      const retryHandler = service.retryHandler;

      const timeoutDelay = retryHandler.calculateDelay(1, 'timeout');
      expect(timeoutDelay).toBeGreaterThan(2000); // Base delay for timeout is 2000ms

      const networkDelay = retryHandler.calculateDelay(1, 'network');
      expect(networkDelay).toBeGreaterThan(1500); // Base delay for network is 1500ms

      const serverDelay = retryHandler.calculateDelay(1, 'server');
      expect(serverDelay).toBeGreaterThan(3000); // Base delay for server is 3000ms

      // Exponential backoff
      const delay1 = retryHandler.calculateDelay(1, 'network');
      const delay2 = retryHandler.calculateDelay(2, 'network');
      expect(delay2).toBeGreaterThan(delay1);
    });
  });

  describe('Fallback Integration', () => {
    test('should use fallback when sendMessageWithFallback encounters connection error', async () => {
      // Mock a connection error
      fetch.mockRejectedValue(new Error('Network error'));

      const response = await service.sendMessageWithFallback('What is my car worth?');
      expect(response).toContain('pricing information');
    });

    test('should re-throw non-connection errors', async () => {
      // Mock a CORS error (non-retryable, should be re-thrown)
      const corsError = new OllamaConnectionError('CORS error', 'cors');
      jest.spyOn(service, 'sendMessage').mockRejectedValue(corsError);

      await expect(service.sendMessageWithFallback('test message')).rejects.toThrow('CORS error');
    });
  });
});