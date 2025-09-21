/**
 * Tests for OllamaService with remote connection support
 */

import OllamaService, { OllamaConnectionError } from './OllamaService.js';

// Mock the configuration
jest.mock('../config/ChatbotConfig.js', () => ({
  getOllamaConfig: () => ({
    baseUrl: 'http://localhost:11434',
    model: 'test-model',
    timeout: 30000,
    retryAttempts: 3,
    corsMode: 'no-cors',
    parameters: {
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9
    }
  }),
  getChatConfig: () => ({
    maxHistoryLength: 10,
    systemPrompt: 'You are a test assistant.',
    fallbackMessages: {
      connectionError: 'Connection error',
      timeout: 'Timeout error',
      modelNotFound: 'Model not found',
      serviceOffline: 'Service offline',
      corsError: 'CORS error',
      networkError: 'Network error'
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

describe('OllamaService', () => {
  let ollamaService;

  beforeEach(() => {
    ollamaService = new OllamaService();
    fetch.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    ollamaService.destroy();
    jest.useRealTimers();
  });

  describe('Connection Management', () => {
    test('should initialize with disconnected status', () => {
      const status = ollamaService.getConnectionStatus();
      expect(status.status).toBe('disconnected');
      expect(status.availableModels).toEqual([]);
    });

    test('should successfully check connection', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'test-model' },
            { name: 'another-model' }
          ]
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await ollamaService.checkConnection();
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          method: 'GET',
          mode: 'no-cors'
        })
      );

      const status = ollamaService.getConnectionStatus();
      expect(status.status).toBe('connected');
      expect(status.availableModels).toEqual(['test-model', 'another-model']);
    });

    test('should handle connection timeout', async () => {
      fetch.mockImplementation(() => 
        new Promise(() => {
          // Never resolve to simulate timeout
        })
      );

      const connectionPromise = ollamaService.checkConnection();
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(10001);
      
      await expect(connectionPromise).rejects.toThrow(OllamaConnectionError);
      
      const status = ollamaService.getConnectionStatus();
      expect(status.status).toBe('error');
      expect(status.error).toContain('timeout');
    }, 10000);

    test('should handle server error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(ollamaService.checkConnection()).rejects.toThrow(OllamaConnectionError);
      
      const status = ollamaService.getConnectionStatus();
      expect(status.status).toBe('error');
    });
  });

  describe('Message Sending', () => {
    beforeEach(() => {
      // Mock successful connection check
      const mockConnectionResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [{ name: 'test-model' }]
        })
      };
      fetch.mockResolvedValueOnce(mockConnectionResponse);
    });

    test('should send message successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          response: 'Test response from Ollama'
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const response = await ollamaService.sendMessage('Hello', []);
      
      expect(response).toBe('Test response from Ollama');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Hello')
        })
      );
    });

    test('should handle model not found error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(ollamaService.sendMessage('Hello', [])).rejects.toThrow(OllamaConnectionError);
    });

    test('should build prompt with conversation history', () => {
      const conversationHistory = [
        { text: 'Previous user message', isBot: false },
        { text: 'Previous bot response', isBot: true }
      ];

      const prompt = ollamaService.buildPrompt('Current message', conversationHistory);
      
      expect(prompt).toContain('You are a test assistant.');
      expect(prompt).toContain('User: Previous user message');
      expect(prompt).toContain('Assistant: Previous bot response');
      expect(prompt).toContain('User: Current message');
      expect(prompt).toContain('Assistant: ');
    });
  });

  describe('Streaming Messages', () => {
    test('should handle streaming responses', async () => {
      const mockStreamResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('{"response": "Hello"}\n')
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('{"response": " world"}\n')
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('{"done": true}\n')
              })
              .mockResolvedValueOnce({
                done: true
              }),
            releaseLock: jest.fn()
          })
        }
      };

      fetch.mockResolvedValueOnce(mockStreamResponse);

      const chunks = [];
      const fullResponses = [];
      
      const result = await ollamaService.sendMessageStream(
        'Hello',
        [],
        (chunk, fullResponse) => {
          chunks.push(chunk);
          fullResponses.push(fullResponse);
        }
      );

      expect(result).toBe('Hello world');
      expect(chunks).toEqual(['Hello', ' world']);
      expect(fullResponses).toEqual(['Hello', 'Hello world']);
    }, 10000);
  });

  describe('Retry Logic', () => {
    test('should retry failed requests', async () => {
      // First call fails, second succeeds
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            response: 'Success after retry'
          })
        });

      const response = await ollamaService.sendMessage('Hello', []);
      
      expect(response).toBe('Success after retry');
      expect(fetch).toHaveBeenCalledTimes(2);
    }, 10000);

    test('should not retry CORS errors', async () => {
      const corsError = new OllamaConnectionError('CORS error', 'cors');
      
      // Mock the internal method to throw CORS error
      ollamaService._sendMessageInternal = jest.fn().mockRejectedValue(corsError);

      await expect(ollamaService.sendMessage('Hello', [])).rejects.toThrow(corsError);
      expect(ollamaService._sendMessageInternal).toHaveBeenCalledTimes(1);
    });
  });

  describe('Model Management', () => {
    test('should list available models', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'model1' },
            { name: 'model2' }
          ]
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const models = await ollamaService.listModels();
      
      expect(models).toEqual(['model1', 'model2']);
    });

    test('should switch to available model', async () => {
      // Mock connection check
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'model1' },
            { name: 'model2' }
          ]
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      await ollamaService.switchModel('model2');
      
      const status = ollamaService.getConnectionStatus();
      expect(status.currentModel).toBe('model2');
    });

    test('should reject switching to unavailable model', async () => {
      // Mock connection check
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [{ name: 'model1' }]
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      await expect(ollamaService.switchModel('nonexistent-model')).rejects.toThrow(OllamaConnectionError);
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers in cors mode', () => {
      ollamaService.config.corsMode = 'cors';
      
      const headers = ollamaService.getCorsHeaders();
      
      expect(headers).toHaveProperty('Access-Control-Allow-Origin', '*');
      expect(headers).toHaveProperty('Access-Control-Allow-Methods');
      expect(headers).toHaveProperty('Access-Control-Allow-Headers');
    });

    test('should not include CORS headers in no-cors mode', () => {
      ollamaService.config.corsMode = 'no-cors';
      
      const headers = ollamaService.getCorsHeaders();
      
      expect(headers).toEqual({});
    });
  });

  describe('Health Monitoring', () => {
    test('should start health monitoring', () => {
      expect(ollamaService.healthCheckInterval).toBeTruthy();
    });

    test('should stop health monitoring on destroy', () => {
      ollamaService.destroy();
      
      expect(ollamaService.healthCheckInterval).toBeNull();
    });
  });
});