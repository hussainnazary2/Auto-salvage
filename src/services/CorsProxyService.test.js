/**
 * Tests for CorsProxyService
 * Tests CORS proxy functionality, fallback mechanisms, and error handling
 */

import CorsProxyService, { CorsProxyError } from './CorsProxyService.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('CorsProxyService', () => {
  let corsProxyService;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      corsProxy: 'https://proxy.example.com',
      useProxy: true,
      proxyTimeout: 5000,
      corsOrigins: 'https://app.example.com',
      corsCredentials: false,
      corsMaxAge: 86400
    };

    corsProxyService = new CorsProxyService(mockConfig);
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Direct Request Strategy', () => {
    it('should make successful direct request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await corsProxyService.directRequest('https://api.example.com/test', {
        method: 'GET'
      });

      expect(result).toBe(mockResponse);
      expect(fetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        signal: expect.any(AbortSignal)
      });
    });

    it('should handle direct request failure', async () => {
      const mockError = new Error('Network error');
      fetch.mockRejectedValueOnce(mockError);

      await expect(corsProxyService.directRequest('https://api.example.com/test'))
        .rejects.toThrow(CorsProxyError);
    });

    it('should detect CORS errors in direct requests', async () => {
      const corsError = new TypeError('Failed to fetch');
      fetch.mockRejectedValueOnce(corsError);

      await expect(corsProxyService.directRequest('https://api.example.com/test'))
        .rejects.toThrow('CORS error in direct request');
    });

    it('should handle timeout in direct requests', async () => {
      // Mock AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetch.mockRejectedValueOnce(abortError);

      await expect(corsProxyService.directRequest('https://api.example.com/test'))
        .rejects.toThrow('Direct request timeout');
    });
  });

  describe('Custom Proxy Strategy', () => {
    it('should make successful custom proxy request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await corsProxyService.customProxyRequest('https://api.example.com/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        headers: { 'Authorization': 'Bearer token' }
      });

      expect(result).toBe(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        'https://proxy.example.com?target=https%3A%2F%2Fapi.example.com%2Ftest',
        expect.objectContaining({
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Proxy-Target': 'https://api.example.com/test',
            'Authorization': 'Bearer token'
          }),
          body: JSON.stringify({ data: 'test' }),
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should handle custom proxy failure', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      fetch.mockResolvedValueOnce(mockResponse);

      await expect(corsProxyService.customProxyRequest('https://api.example.com/test'))
        .rejects.toThrow('Custom proxy request failed');
    });

    it('should throw error when custom proxy not configured', async () => {
      const serviceWithoutProxy = new CorsProxyService({ corsProxy: null });

      await expect(serviceWithoutProxy.executeStrategy('custom', 'https://api.example.com/test'))
        .rejects.toThrow('Custom proxy not configured');
    });
  });

  describe('Public Proxy Strategy', () => {
    beforeEach(() => {
      // Mock development environment
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should try public proxies in development', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await corsProxyService.publicProxyRequest('https://api.example.com/test');

      expect(result).toBe(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://cors-anywhere.herokuapp.com/'),
        expect.any(Object)
      );
    });

    it('should be disabled in production', async () => {
      process.env.NODE_ENV = 'production';

      await expect(corsProxyService.executeStrategy('public', 'https://api.example.com/test'))
        .rejects.toThrow('Public proxies disabled in production');
    });

    it('should try multiple public proxies on failure', async () => {
      // First proxy fails
      fetch.mockRejectedValueOnce(new Error('Proxy 1 failed'));
      // Second proxy succeeds
      const mockResponse = { ok: true, status: 200 };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await corsProxyService.publicProxyRequest('https://api.example.com/test');

      expect(result).toBe(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Automatic Fallback', () => {
    it('should try all strategies in order', async () => {
      // Direct request fails with CORS error
      const corsError = new TypeError('Failed to fetch');
      fetch.mockRejectedValueOnce(corsError);

      // Custom proxy succeeds
      const mockResponse = { ok: true, status: 200 };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await corsProxyService.makeRequest('https://api.example.com/test');

      expect(result).toBe(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error when all strategies fail', async () => {
      // All requests fail
      fetch.mockRejectedValue(new Error('All failed'));

      await expect(corsProxyService.makeRequest('https://api.example.com/test'))
        .rejects.toThrow('All CORS proxy strategies failed');
    });
  });

  describe('URL Building', () => {
    it('should build proxy URL with query parameter format', () => {
      const proxyBase = 'https://proxy.com?target=';
      const targetUrl = 'https://api.example.com/test';
      
      const result = corsProxyService.buildProxyUrl(proxyBase, targetUrl);
      
      expect(result).toBe('https://proxy.com?target=https%3A%2F%2Fapi.example.com%2Ftest');
    });

    it('should build proxy URL with path format', () => {
      const proxyBase = 'https://proxy.com/';
      const targetUrl = 'https://api.example.com/test';
      
      const result = corsProxyService.buildProxyUrl(proxyBase, targetUrl);
      
      expect(result).toBe('https://proxy.com/https%3A%2F%2Fapi.example.com%2Ftest');
    });

    it('should default to query parameter format', () => {
      const proxyBase = 'https://proxy.com';
      const targetUrl = 'https://api.example.com/test';
      
      const result = corsProxyService.buildProxyUrl(proxyBase, targetUrl);
      
      expect(result).toBe('https://proxy.com?target=https%3A%2F%2Fapi.example.com%2Ftest');
    });
  });

  describe('Header Filtering', () => {
    it('should filter headers for proxy requests', () => {
      const originalHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token',
        'X-Custom-Header': 'value',
        'Cookie': 'session=123',
        'Accept': 'application/json'
      };

      const filtered = corsProxyService.getProxyHeaders(originalHeaders);

      expect(filtered).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token',
        'Accept': 'application/json'
      });
      expect(filtered).not.toHaveProperty('X-Custom-Header');
      expect(filtered).not.toHaveProperty('Cookie');
    });
  });

  describe('CORS Error Detection', () => {
    it('should detect CORS errors by message content', () => {
      const corsError1 = new Error('CORS policy blocked');
      const corsError2 = new Error('Cross-Origin Request Blocked');
      const networkError = new TypeError('Failed to fetch');
      const otherError = new Error('Something else');

      expect(corsProxyService.isCorsError(corsError1)).toBe(true);
      expect(corsProxyService.isCorsError(corsError2)).toBe(true);
      expect(corsProxyService.isCorsError(networkError)).toBe(true);
      expect(corsProxyService.isCorsError(otherError)).toBe(false);
    });
  });

  describe('Proxy Testing', () => {
    it('should test proxy connectivity successfully', async () => {
      const mockResponse = { ok: true, status: 200 };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await corsProxyService.testProxy('https://proxy.example.com');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Proxy is working correctly');
    });

    it('should handle proxy test failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Proxy failed'));

      const result = await corsProxyService.testProxy('https://proxy.example.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Proxy test failed');
    });
  });

  describe('Configuration Recommendations', () => {
    it('should recommend custom proxy when not configured', () => {
      const serviceWithoutProxy = new CorsProxyService({ corsProxy: null });
      
      const recommendations = serviceWithoutProxy.getProxyRecommendations();
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'config',
          message: expect.stringContaining('custom CORS proxy')
        })
      );
    });

    it('should recommend security measures in production', () => {
      process.env.NODE_ENV = 'production';
      const serviceWithoutProxy = new CorsProxyService({ corsProxy: null });
      
      const recommendations = serviceWithoutProxy.getProxyRecommendations();
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'security',
          message: expect.stringContaining('Public proxies are disabled')
        })
      );
      
      process.env.NODE_ENV = 'test';
    });

    it('should recommend timeout adjustments', () => {
      const serviceWithShortTimeout = new CorsProxyService({ 
        corsProxy: 'https://proxy.com',
        proxyTimeout: 5000 
      });
      
      const recommendations = serviceWithShortTimeout.getProxyRecommendations();
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'performance',
          message: expect.stringContaining('increasing proxy timeout')
        })
      );
    });
  });
});