/**
 * Tests for enhanced error handling in OllamaService
 * Focuses on remote connection scenarios and graceful degradation
 */

import { OllamaService, OllamaConnectionError } from './OllamaService.js';
import chatbotConfig from '../config/ChatbotConfig.js';

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
    healthCheckInterval: 30000,
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

describe('OllamaService Enhanced Error Handling', () => {
  let service;

  beforeEach(() => {
    jest.setTimeout(15000); // Increase timeout for retry tests
    service = new OllamaService();
    fetch.mockClear();
  });

  afterEach(() => {
    service.destroy();
    jest.setTimeout(5000); // Reset timeout
  });

  describe('Error Categorization', () => {
    test('should categorize remote connection timeout errors', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      fetch.mockRejectedValue(abortError);

      try {
        await service.checkConnection();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(OllamaConnectionError);
        expect(error.type).toBe('timeout');
        expect(error.message).toBe('Remote timeout message');
      }
    });

    test('should categorize CORS errors correctly', async () => {
      const corsError = new Error('CORS policy blocked the request');
      fetch.mockRejectedValue(corsError);

      try {
        await service.checkConnection();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(OllamaConnectionError);
        expect(error.type).toBe('cors');
        expect(error.message).toBe('CORS error message');
      }
    });

    test('should categorize remote connection refused errors', async () => {
      const refusedError = new Error('Connection refused ECONNREFUSED');
      fetch.mockRejectedValue(refusedError);

      try {
        await service.checkConnection();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(OllamaConnectionError);
        expect(error.type).toBe('connection');
        expect(error.message).toBe('Remote connection refused');
      }
    });

    test('should categorize HTTP status errors correctly', async () => {
      // Mock a successful fetch that returns a 503 status
      fetch.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }));

      try {
        await service.checkConnection();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(OllamaConnectionError);
        expect(error.type).toBe('server');
        expect(error.message).toBe('Remote service unavailable');
      }
    });

    test('should categorize 404 model errors', async () => {
      fetch.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }));

      try {
        await service.checkConnection();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(OllamaConnectionError);
        expect(error.type).toBe('model');
        expect(error.message).toBe('Model not found message');
      }
    });

    test('should categorize authentication errors', async () => {
      fetch.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      }));

      try {
        await service.checkConnection();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(OllamaConnectionError);
        expect(error.type).toBe('auth');
        expect(error.message).toBe('Authentication failed');
      }
    });
  });

  describe('Local vs Remote Connection Detection', () => {
    test('should detect remote connections correctly', () => {
      expect(service.isRemoteConnection()).toBe(true);
    });

    test('should detect localhost as local connection', () => {
      // Create service with localhost URL
      const localConfig = {
        ...chatbotConfig.getOllamaConfig(),
        baseUrl: 'http://localhost:11434'
      };
      
      // Mock the config temporarily
      const originalGetOllamaConfig = chatbotConfig.getOllamaConfig;
      chatbotConfig.getOllamaConfig = () => localConfig;
      
      const localService = new OllamaService();
      expect(localService.isRemoteConnection()).toBe(false);
      
      // Restore original config
      chatbotConfig.getOllamaConfig = originalGetOllamaConfig;
      localService.destroy();
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

    test('should use fallback when sendMessageWithFallback fails', async () => {
      // Mock connection failure
      fetch.mockRejectedValue(new Error('Network error'));

      const response = await service.sendMessageWithFallback('What is my car worth?');
      expect(response).toContain('pricing information');
    });

    test('should simulate streaming for fallback responses', async () => {
      // Mock connection failure
      fetch.mockRejectedValue(new Error('Network error'));

      const chunks = [];
      const response = await service.sendMessageStreamWithFallback(
        'Help me sell my car',
        [],
        (chunk, fullResponse) => {
          chunks.push({ chunk, fullResponse });
        }
      );

      expect(response).toContain('sell your damaged car');
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].fullResponse).toBe(response);
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

  describe('Retry Logic', () => {
    test('should not retry non-retryable errors', async () => {
      // Mock CORS error (non-retryable)
      const corsError = new Error('CORS policy blocked');
      fetch.mockRejectedValue(corsError);

      try {
        await service.sendMessage('test message');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(OllamaConnectionError);
        expect(error.type).toBe('cors');
        // Should only call fetch once (no retries)
        expect(fetch).toHaveBeenCalledTimes(1);
      }
    });

    test('should retry network errors with exponential backoff', async () => {
      // Mock network error (retryable)
      const networkError = new Error('Failed to fetch');
      fetch.mockRejectedValue(networkError);

      const startTime = Date.now();
      
      try {
        await service.sendMessage('test message');
        fail('Should have thrown an error');
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(error).toBeInstanceOf(OllamaConnectionError);
        expect(error.message).toBe('Retry attempts exhausted');
        
        // Should have retried (called fetch multiple times)
        expect(fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
        
        // Should have taken some time due to delays
        expect(duration).toBeGreaterThan(1000); // At least 1 second for delays
      }
    });
  });
});