/**
 * CORS Proxy Service
 * Handles proxy requests when direct CORS isn't possible
 * Supports multiple proxy strategies and fallback mechanisms
 */

class CorsProxyError extends Error {
  constructor(message, type = 'proxy', originalError = null) {
    super(message);
    this.name = 'CorsProxyError';
    this.type = type; // 'proxy', 'timeout', 'network', 'config'
    this.originalError = originalError;
  }
}

class CorsProxyService {
  constructor(config) {
    this.config = config;
    
    // Determine proxy strategies based on configuration and environment
    this.proxyStrategies = this.determineProxyStrategies();
    
    // Public CORS proxies (use with caution in production)
    this.publicProxies = [
      {
        url: 'https://cors-anywhere.herokuapp.com/',
        format: 'prefix',
        description: 'CORS Anywhere (requires demo request)',
        production: false
      },
      {
        url: 'https://api.allorigins.win/raw?url=',
        format: 'query',
        description: 'AllOrigins (free service)',
        production: false
      },
      {
        url: 'https://corsproxy.io/?',
        format: 'query',
        description: 'CORSProxy.io (free service)',
        production: false
      }
    ];
  }

  /**
   * Determine which proxy strategies to use based on configuration
   */
  determineProxyStrategies() {
    const strategies = [];
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Always try direct first unless proxy is forced
    if (!this.config.useProxy) {
      strategies.push('direct');
    }
    
    // Add custom proxy if configured
    if (this.config.corsProxy) {
      strategies.push('custom');
    }
    
    // Add public proxies only in development
    if (!isProduction && !this.config.corsProxy) {
      strategies.push('public');
    }
    
    // If proxy is forced but no custom proxy, still try direct as fallback
    if (this.config.useProxy && !this.config.corsProxy) {
      strategies.push('direct');
    }
    
    return strategies.length > 0 ? strategies : ['direct'];
  }

  /**
   * Make a proxied request with automatic fallback
   */
  async makeRequest(url, options = {}) {
    const errors = [];
    
    for (const strategy of this.proxyStrategies) {
      try {
        return await this.executeStrategy(strategy, url, options);
      } catch (error) {
        errors.push({ strategy, error });
        console.warn(`CORS proxy strategy '${strategy}' failed:`, error.message);
      }
    }
    
    // All strategies failed
    throw new CorsProxyError(
      `All CORS proxy strategies failed. Last error: ${errors[errors.length - 1]?.error?.message}`,
      'proxy',
      errors
    );
  }

  /**
   * Execute a specific proxy strategy
   */
  async executeStrategy(strategy, url, options) {
    switch (strategy) {
      case 'direct':
        return await this.directRequest(url, options);
      
      case 'custom':
        if (!this.config.corsProxy) {
          throw new CorsProxyError('Custom proxy not configured', 'config');
        }
        return await this.customProxyRequest(url, options);
      
      case 'public':
        if (process.env.NODE_ENV === 'production') {
          throw new CorsProxyError('Public proxies disabled in production', 'config');
        }
        return await this.publicProxyRequest(url, options);
      
      default:
        throw new CorsProxyError(`Unknown proxy strategy: ${strategy}`, 'config');
    }
  }

  /**
   * Direct request (no proxy)
   */
  async directRequest(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.proxyTimeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new CorsProxyError(
          `Direct request failed with status ${response.status}`,
          'network'
        );
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new CorsProxyError('Direct request timeout', 'timeout', error);
      }
      
      // Check if this is a CORS error
      if (this.isCorsError(error)) {
        throw new CorsProxyError('CORS error in direct request', 'cors', error);
      }
      
      throw new CorsProxyError('Direct request failed', 'network', error);
    }
  }

  /**
   * Custom proxy request
   */
  async customProxyRequest(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.proxyTimeout);
    
    try {
      // Construct proxy URL
      const proxyUrl = this.buildProxyUrl(this.config.corsProxy, url);
      
      // Prepare proxy request options
      const proxyOptions = {
        method: options.method || 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Proxy-Target': url,
          ...this.getProxyHeaders(options.headers)
        },
        signal: controller.signal
      };
      
      // Add body if present
      if (options.body) {
        proxyOptions.body = options.body;
      }
      
      const response = await fetch(proxyUrl, proxyOptions);
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new CorsProxyError(
          `Custom proxy request failed with status ${response.status}`,
          'proxy'
        );
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new CorsProxyError('Custom proxy timeout', 'timeout', error);
      }
      
      throw new CorsProxyError('Custom proxy request failed', 'proxy', error);
    }
  }

  /**
   * Public proxy request (development only)
   */
  async publicProxyRequest(url, options) {
    const errors = [];
    const availableProxies = this.publicProxies.filter(proxy => 
      process.env.NODE_ENV !== 'production' || proxy.production
    );
    
    if (availableProxies.length === 0) {
      throw new CorsProxyError(
        'No public proxies available in production environment',
        'config'
      );
    }
    
    for (const proxy of availableProxies) {
      try {
        console.log(`Trying public proxy: ${proxy.description}`);
        return await this.tryPublicProxy(proxy, url, options);
      } catch (error) {
        errors.push({ proxy: proxy.url, error });
        console.warn(`Public proxy ${proxy.description} failed:`, error.message);
      }
    }
    
    throw new CorsProxyError(
      `All ${availableProxies.length} public proxies failed`,
      'proxy',
      errors
    );
  }

  /**
   * Try a specific public proxy
   */
  async tryPublicProxy(proxy, targetUrl, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.proxyTimeout);
    
    try {
      const fullProxyUrl = this.buildPublicProxyUrl(proxy, targetUrl);
      
      const response = await fetch(fullProxyUrl, {
        method: options.method || 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Proxy-Type': 'public',
          ...this.getProxyHeaders(options.headers)
        },
        body: options.body,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new CorsProxyError(
          `Public proxy ${proxy.description} failed with status ${response.status}`,
          'proxy'
        );
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new CorsProxyError(`Public proxy ${proxy.description} timeout`, 'timeout', error);
      }
      
      throw new CorsProxyError(`Public proxy ${proxy.description} failed`, 'proxy', error);
    }
  }

  /**
   * Build URL for public proxy based on its format
   */
  buildPublicProxyUrl(proxy, targetUrl) {
    switch (proxy.format) {
      case 'prefix':
        return proxy.url + targetUrl;
      case 'query':
        return proxy.url + encodeURIComponent(targetUrl);
      default:
        // Default to query format
        return proxy.url + encodeURIComponent(targetUrl);
    }
  }

  /**
   * Build proxy URL based on proxy type
   */
  buildProxyUrl(proxyBase, targetUrl) {
    // Handle different proxy URL formats
    if (proxyBase.includes('?target=')) {
      // Query parameter format: proxy.com?target=URL
      return `${proxyBase}${encodeURIComponent(targetUrl)}`;
    } else if (proxyBase.endsWith('/')) {
      // Path format: proxy.com/URL
      return `${proxyBase}${encodeURIComponent(targetUrl)}`;
    } else {
      // Default to query parameter format
      return `${proxyBase}?target=${encodeURIComponent(targetUrl)}`;
    }
  }

  /**
   * Get headers suitable for proxy requests
   */
  getProxyHeaders(originalHeaders = {}) {
    const proxyHeaders = {};
    
    // Filter out headers that might cause issues with proxies
    const allowedHeaders = [
      'content-type',
      'accept',
      'authorization',
      'x-requested-with'
    ];
    
    for (const [key, value] of Object.entries(originalHeaders)) {
      const lowerKey = key.toLowerCase();
      if (allowedHeaders.includes(lowerKey)) {
        proxyHeaders[key] = value;
      }
    }
    
    return proxyHeaders;
  }

  /**
   * Check if an error is CORS-related
   */
  isCorsError(error) {
    const message = error.message.toLowerCase();
    return message.includes('cors') || 
           message.includes('cross-origin') || 
           (message.includes('failed to fetch') && error instanceof TypeError);
  }

  /**
   * Test proxy connectivity
   */
  async testProxy(proxyUrl) {
    try {
      const testUrl = 'https://httpbin.org/get';
      const response = await this.customProxyRequest(testUrl, { method: 'GET' });
      
      return {
        success: true,
        status: response.status,
        message: 'Proxy is working correctly'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Proxy test failed'
      };
    }
  }

  /**
   * Get proxy configuration recommendations
   */
  getProxyRecommendations() {
    const recommendations = [];
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!this.config.corsProxy) {
      recommendations.push({
        type: 'config',
        priority: 'medium',
        message: 'Consider setting up a custom CORS proxy for better reliability',
        action: 'Set REACT_APP_CORS_PROXY environment variable',
        example: 'REACT_APP_CORS_PROXY=https://your-proxy.herokuapp.com'
      });
    }
    
    if (isProduction && !this.config.corsProxy) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        message: 'Public proxies are disabled in production for security',
        action: 'Configure a custom proxy or enable direct CORS on your Ollama server',
        example: 'Set up your own CORS proxy service'
      });
    }
    
    if (this.config.proxyTimeout < 30000) {
      recommendations.push({
        type: 'performance',
        priority: 'low',
        message: 'Consider increasing proxy timeout for remote connections',
        action: 'Set REACT_APP_PROXY_TIMEOUT to 30000 or higher',
        example: 'REACT_APP_PROXY_TIMEOUT=45000'
      });
    }
    
    if (this.config.useProxy && !this.config.corsProxy) {
      recommendations.push({
        type: 'config',
        priority: 'high',
        message: 'Proxy is enabled but no proxy URL is configured',
        action: 'Set REACT_APP_CORS_PROXY or disable proxy mode',
        example: 'REACT_APP_USE_PROXY=false'
      });
    }
    
    return recommendations;
  }

  /**
   * Get proxy status and configuration summary
   */
  getProxyStatus() {
    const isProduction = process.env.NODE_ENV === 'production';
    const availableStrategies = this.proxyStrategies;
    const availablePublicProxies = this.publicProxies.filter(proxy => 
      !isProduction || proxy.production
    );
    
    return {
      enabled: this.config.useProxy,
      customProxyConfigured: !!this.config.corsProxy,
      customProxyUrl: this.config.corsProxy,
      availableStrategies,
      publicProxiesAvailable: availablePublicProxies.length,
      publicProxies: availablePublicProxies.map(proxy => ({
        description: proxy.description,
        production: proxy.production
      })),
      timeout: this.config.proxyTimeout,
      environment: isProduction ? 'production' : 'development'
    };
  }

  /**
   * Generate proxy setup instructions
   */
  generateProxySetupInstructions() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      environment: isProduction ? 'production' : 'development',
      options: [
        {
          title: 'Option 1: Configure Ollama CORS (Recommended)',
          description: 'Enable CORS directly on your Ollama server',
          steps: [
            'Set OLLAMA_ORIGINS environment variable on your PC',
            'Restart Ollama service',
            'Test direct connection'
          ],
          pros: ['No proxy needed', 'Better performance', 'More secure'],
          cons: ['Requires server configuration access']
        },
        {
          title: 'Option 2: Custom CORS Proxy',
          description: 'Set up your own CORS proxy service',
          steps: [
            'Deploy a CORS proxy (e.g., on Heroku, Vercel)',
            'Set REACT_APP_CORS_PROXY environment variable',
            'Enable proxy mode with REACT_APP_USE_PROXY=true'
          ],
          pros: ['Full control', 'Works in production', 'Reliable'],
          cons: ['Requires additional service', 'More complex setup']
        },
        ...(isProduction ? [] : [{
          title: 'Option 3: Public Proxy (Development Only)',
          description: 'Use public CORS proxy services for testing',
          steps: [
            'No configuration needed',
            'Automatic fallback in development'
          ],
          pros: ['No setup required', 'Good for testing'],
          cons: ['Not reliable', 'Not for production', 'Rate limited']
        }])
      ]
    };
  }
}

export { CorsProxyService, CorsProxyError };
export default CorsProxyService;