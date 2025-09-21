/**
 * Tests for ChatbotConfig
 * Validates configuration loading, validation, and error handling
 */

import { ChatbotConfig, ConfigurationError } from './ChatbotConfig';

// Mock environment variables
const mockEnv = (envVars) => {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...envVars };
  return () => {
    process.env = originalEnv;
  };
};

describe('ChatbotConfig', () => {
  let config;
  let restoreEnv;

  beforeEach(() => {
    // Reset environment
    restoreEnv = mockEnv({
      NODE_ENV: 'test'
    });
  });

  afterEach(() => {
    if (restoreEnv) {
      restoreEnv();
    }
  });

  describe('Configuration Loading', () => {
    test('should load default configuration in development', () => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'development'
      });

      config = new ChatbotConfig();
      
      expect(config.isValid()).toBe(true);
      expect(config.getOllamaConfig().baseUrl).toBe('http://localhost:11434');
      expect(config.getOllamaConfig().model).toBe('mistral-nz-cars');
      expect(config.getOllamaConfig().corsMode).toBe('no-cors');
    });

    test('should require OLLAMA_URL in production', () => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'production'
      });

      expect(() => {
        config = new ChatbotConfig();
      }).toThrow(ConfigurationError);
    });

    test('should load custom environment variables', () => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'development',
        REACT_APP_OLLAMA_URL: 'https://custom-ollama.example.com',
        REACT_APP_OLLAMA_MODEL: 'custom-model',
        REACT_APP_OLLAMA_TIMEOUT: '60000',
        REACT_APP_CORS_MODE: 'cors'
      });

      config = new ChatbotConfig();
      
      expect(config.isValid()).toBe(true);
      expect(config.getOllamaConfig().baseUrl).toBe('https://custom-ollama.example.com');
      expect(config.getOllamaConfig().model).toBe('custom-model');
      expect(config.getOllamaConfig().timeout).toBe(60000);
      expect(config.getOllamaConfig().corsMode).toBe('cors');
    });
  });

  describe('Configuration Validation', () => {
    test('should validate URL format', () => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'development',
        REACT_APP_OLLAMA_URL: 'invalid-url'
      });

      expect(() => {
        config = new ChatbotConfig();
      }).toThrow(ConfigurationError);
    });

    test('should validate timeout range', () => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'development',
        REACT_APP_OLLAMA_TIMEOUT: '500'
      });

      expect(() => {
        config = new ChatbotConfig();
      }).toThrow(ConfigurationError);
    });

    test('should validate temperature range', () => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'development',
        REACT_APP_OLLAMA_TEMPERATURE: '3.0'
      });

      expect(() => {
        config = new ChatbotConfig();
      }).toThrow(ConfigurationError);
    });

    test('should validate CORS mode values', () => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'development',
        REACT_APP_CORS_MODE: 'invalid-mode'
      });

      expect(() => {
        config = new ChatbotConfig();
      }).toThrow(ConfigurationError);
    });
  });

  describe('Type Conversion', () => {
    test('should convert string numbers to integers', () => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'development',
        REACT_APP_OLLAMA_TIMEOUT: '45000',
        REACT_APP_CHAT_MAX_HISTORY: '15'
      });

      config = new ChatbotConfig();
      
      expect(config.getOllamaConfig().timeout).toBe(45000);
      expect(config.getChatConfig().maxHistoryLength).toBe(15);
    });

    test('should convert string booleans', () => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'development',
        REACT_APP_SHOW_CONNECTION_STATUS: 'false',
        REACT_APP_USE_PROXY: 'true'
      });

      config = new ChatbotConfig();
      
      expect(config.getUIConfig().showConnectionStatus).toBe(false);
      expect(config.getNetworkConfig().useProxy).toBe(true);
    });

    test('should handle invalid number formats', () => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'development',
        REACT_APP_OLLAMA_TIMEOUT: 'not-a-number'
      });

      expect(() => {
        config = new ChatbotConfig();
      }).toThrow(ConfigurationError);
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'development'
      });
      config = new ChatbotConfig();
    });

    test('should allow runtime configuration updates', () => {
      const updates = {
        ollama: {
          timeout: 60000
        },
        ui: {
          showConnectionStatus: false
        }
      };

      config.updateConfig(updates);
      
      expect(config.getOllamaConfig().timeout).toBe(60000);
      expect(config.getUIConfig().showConnectionStatus).toBe(false);
      // Other values should remain unchanged
      expect(config.getOllamaConfig().baseUrl).toBe('http://localhost:11434');
    });

    test('should validate updates', () => {
      const invalidUpdates = {
        ollama: {
          timeout: 100 // Too low
        }
      };

      expect(() => {
        config.updateConfig(invalidUpdates);
      }).toThrow(ConfigurationError);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      restoreEnv();
      restoreEnv = mockEnv({
        NODE_ENV: 'development'
      });
      config = new ChatbotConfig();
    });

    test('should provide configuration summary', () => {
      const summary = config.getConfigSummary();
      
      expect(summary).toHaveProperty('environment');
      expect(summary).toHaveProperty('ollamaUrl');
      expect(summary).toHaveProperty('model');
      expect(summary.environment).toBe('development');
    });

    test('should provide section-specific configs', () => {
      expect(config.getOllamaConfig()).toHaveProperty('baseUrl');
      expect(config.getChatConfig()).toHaveProperty('maxHistoryLength');
      expect(config.getUIConfig()).toHaveProperty('showConnectionStatus');
      expect(config.getNetworkConfig()).toHaveProperty('healthCheckInterval');
    });
  });
});