/**
 * Integration tests for the configuration system
 * Tests real-world usage scenarios
 */

import config, { getOllamaConfig, getChatConfig, getUIConfig, getNetworkConfig } from './index';

describe('Configuration Integration', () => {
  test('should provide all configuration sections through convenience exports', () => {
    expect(getOllamaConfig()).toBeDefined();
    expect(getChatConfig()).toBeDefined();
    expect(getUIConfig()).toBeDefined();
    expect(getNetworkConfig()).toBeDefined();
    
    // Verify structure
    expect(getOllamaConfig()).toHaveProperty('baseUrl');
    expect(getOllamaConfig()).toHaveProperty('model');
    expect(getChatConfig()).toHaveProperty('maxHistoryLength');
    expect(getUIConfig()).toHaveProperty('showConnectionStatus');
    expect(getNetworkConfig()).toHaveProperty('healthCheckInterval');
  });

  test('should work with default singleton instance', () => {
    expect(config.isValid()).toBe(true);
    
    const summary = config.getConfigSummary();
    expect(summary).toHaveProperty('environment');
    expect(summary).toHaveProperty('ollamaUrl');
    expect(summary).toHaveProperty('model');
  });

  test('should provide fallback messages for different error scenarios', () => {
    const chatConfig = getChatConfig();
    
    expect(chatConfig.fallbackMessages).toHaveProperty('connectionError');
    expect(chatConfig.fallbackMessages).toHaveProperty('timeout');
    expect(chatConfig.fallbackMessages).toHaveProperty('modelNotFound');
    expect(chatConfig.fallbackMessages).toHaveProperty('serviceOffline');
    expect(chatConfig.fallbackMessages).toHaveProperty('corsError');
    expect(chatConfig.fallbackMessages).toHaveProperty('networkError');
    
    // Verify messages are user-friendly
    expect(chatConfig.fallbackMessages.connectionError).toContain('trouble connecting');
    expect(chatConfig.fallbackMessages.timeout).toContain('taking longer than expected');
  });

  test('should provide appropriate configuration for chatbot API calls', () => {
    const ollamaConfig = getOllamaConfig();
    
    // Verify all required properties for API calls
    expect(ollamaConfig.baseUrl).toBeDefined();
    expect(ollamaConfig.model).toBeDefined();
    expect(ollamaConfig.timeout).toBeGreaterThan(0);
    expect(ollamaConfig.parameters.temperature).toBeGreaterThanOrEqual(0);
    expect(ollamaConfig.parameters.max_tokens).toBeGreaterThan(0);
    
    // Verify URL format
    expect(() => new URL(ollamaConfig.baseUrl)).not.toThrow();
  });

  test('should provide UI configuration for React components', () => {
    const uiConfig = getUIConfig();
    
    expect(typeof uiConfig.showConnectionStatus).toBe('boolean');
    expect(typeof uiConfig.enableModelSelection).toBe('boolean');
    expect(uiConfig.typingIndicatorDelay).toBeGreaterThanOrEqual(0);
    expect(uiConfig.maxRetryAttempts).toBeGreaterThanOrEqual(0);
    expect(uiConfig.retryDelay).toBeGreaterThanOrEqual(100);
  });

  test('should provide network configuration for connection management', () => {
    const networkConfig = getNetworkConfig();
    
    expect(networkConfig.healthCheckInterval).toBeGreaterThanOrEqual(5000);
    expect(typeof networkConfig.useProxy).toBe('boolean');
    
    // CORS proxy should be null or valid URL
    if (networkConfig.corsProxy) {
      expect(() => new URL(networkConfig.corsProxy)).not.toThrow();
    }
  });

  test('should simulate production environment requirements', () => {
    // This test verifies the configuration would work in production
    const ollamaConfig = getOllamaConfig();
    
    // In development, we should have localhost
    expect(ollamaConfig.baseUrl).toBe('http://localhost:11434');
    expect(ollamaConfig.corsMode).toBe('no-cors');
    
    // Timeout should be reasonable for local connections
    expect(ollamaConfig.timeout).toBeLessThanOrEqual(30000);
  });
});