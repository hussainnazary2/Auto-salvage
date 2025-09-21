/**
 * Network Reliability Manager
 * Handles request queuing, connection quality monitoring, and timeout management
 * for enhanced network reliability in remote Ollama connections
 */

class NetworkReliabilityManager {
  constructor(config = {}) {
    this.config = {
      maxQueueSize: config.maxQueueSize || 10,
      connectionQualityWindow: config.connectionQualityWindow || 5, // Number of recent requests to track
      slowConnectionThreshold: config.slowConnectionThreshold || 5000, // 5 seconds
      verySlowConnectionThreshold: config.verySlowConnectionThreshold || 10000, // 10 seconds
      queueProcessingInterval: config.queueProcessingInterval || 1000, // 1 second
      timeoutGracePeriod: config.timeoutGracePeriod || 2000, // Extra time before showing timeout warning
      ...config
    };

    // Request queue for when connection is temporarily unavailable
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.queueProcessor = null;

    // Connection quality tracking
    this.responseTimeHistory = [];
    this.connectionQuality = 'unknown'; // 'excellent', 'good', 'slow', 'poor', 'unknown'
    this.lastQualityUpdate = null;

    // Timeout management
    this.activeTimeouts = new Map();
    this.timeoutWarnings = new Map();

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeoutRequests: 0,
      queuedRequests: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Execute a request with reliability features
   */
  async executeRequest(requestId, requestFunction, options = {}) {
    const {
      timeout = 30000,
      priority = 'normal', // 'high', 'normal', 'low'
      onTimeout = null,
      onProgress = null,
      retryOnFailure = true
    } = options;

    this.stats.totalRequests++;

    // If connection is poor and queue is enabled, queue the request
    if (this.shouldQueueRequest() && priority !== 'high') {
      return this.queueRequest(requestId, requestFunction, options);
    }

    return this.executeRequestWithTimeout(requestId, requestFunction, timeout, onTimeout, onProgress);
  }

  /**
   * Execute request with timeout handling and progress tracking
   */
  async executeRequestWithTimeout(requestId, requestFunction, timeout, onTimeout, onProgress) {
    const startTime = Date.now();
    let timeoutWarningShown = false;

    // Set up timeout warning
    const warningTimeout = setTimeout(() => {
      timeoutWarningShown = true;
      this.timeoutWarnings.set(requestId, true);
      if (onTimeout) {
        onTimeout('warning', timeout);
      }
    }, timeout - this.config.timeoutGracePeriod);

    // Set up actual timeout
    const controller = new AbortController();
    const actualTimeout = setTimeout(() => {
      controller.abort();
      this.stats.timeoutRequests++;
    }, timeout);

    this.activeTimeouts.set(requestId, { warningTimeout, actualTimeout, controller });

    try {
      // Execute the request with progress tracking
      let progressInterval;
      if (onProgress) {
        progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min((elapsed / timeout) * 100, 95); // Cap at 95% until complete
          onProgress(progress, elapsed, timeoutWarningShown);
        }, 500);
      }

      const result = await requestFunction(controller.signal);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      // Request completed successfully
      const responseTime = Date.now() - startTime;
      this.recordResponseTime(responseTime);
      this.stats.successfulRequests++;

      // Clean up timeouts
      this.cleanupTimeouts(requestId);

      // Final progress update
      if (onProgress) {
        onProgress(100, responseTime, false);
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.stats.failedRequests++;

      // Clean up timeouts
      this.cleanupTimeouts(requestId);

      // Record response time even for failures (helps with quality assessment)
      if (!controller.signal.aborted) {
        this.recordResponseTime(responseTime);
      }

      throw error;
    }
  }

  /**
   * Queue a request for later execution
   */
  async queueRequest(requestId, requestFunction, options) {
    if (this.requestQueue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority request if queue is full
      const lowPriorityIndex = this.requestQueue.findIndex(req => req.priority === 'low');
      if (lowPriorityIndex !== -1) {
        const removed = this.requestQueue.splice(lowPriorityIndex, 1)[0];
        removed.reject(new Error('Request removed from queue due to capacity limit'));
      } else {
        throw new Error('Request queue is full and no low-priority requests to remove');
      }
    }

    return new Promise((resolve, reject) => {
      const queuedRequest = {
        id: requestId,
        requestFunction,
        options,
        resolve,
        reject,
        queuedAt: Date.now(),
        priority: options.priority || 'normal'
      };

      // Insert based on priority
      if (options.priority === 'high') {
        this.requestQueue.unshift(queuedRequest);
      } else {
        this.requestQueue.push(queuedRequest);
      }

      this.stats.queuedRequests++;

      // Start queue processing if not already running
      if (!this.isProcessingQueue) {
        this.startQueueProcessing();
      }
    });
  }

  /**
   * Start processing the request queue
   */
  startQueueProcessing() {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;
    this.queueProcessor = setInterval(async () => {
      if (this.requestQueue.length === 0) {
        this.stopQueueProcessing();
        return;
      }

      // Check if connection quality is good enough to process queue
      if (this.connectionQuality === 'poor' || this.connectionQuality === 'unknown') {
        return; // Wait for better connection
      }

      // Process one request from the queue
      const request = this.requestQueue.shift();
      if (request) {
        try {
          const result = await this.executeRequestWithTimeout(
            request.id,
            request.requestFunction,
            request.options.timeout || 30000,
            request.options.onTimeout,
            request.options.onProgress
          );
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
    }, this.config.queueProcessingInterval);
  }

  /**
   * Stop processing the request queue
   */
  stopQueueProcessing() {
    this.isProcessingQueue = false;
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = null;
    }
  }

  /**
   * Record response time and update connection quality
   */
  recordResponseTime(responseTime) {
    this.responseTimeHistory.push({
      time: responseTime,
      timestamp: Date.now()
    });

    // Keep only recent history
    if (this.responseTimeHistory.length > this.config.connectionQualityWindow) {
      this.responseTimeHistory.shift();
    }

    this.updateConnectionQuality();
    this.updateStatistics();
  }

  /**
   * Update connection quality based on recent response times
   */
  updateConnectionQuality() {
    if (this.responseTimeHistory.length === 0) {
      this.connectionQuality = 'unknown';
      return;
    }

    const recentTimes = this.responseTimeHistory.map(entry => entry.time);
    const averageTime = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
    const maxTime = Math.max(...recentTimes);

    // Determine quality based on average and max response times
    if (averageTime < 1000 && maxTime < 2000) {
      this.connectionQuality = 'excellent';
    } else if (averageTime < 2000 && maxTime < this.config.slowConnectionThreshold) {
      this.connectionQuality = 'good';
    } else if (averageTime < this.config.slowConnectionThreshold && maxTime < this.config.verySlowConnectionThreshold) {
      this.connectionQuality = 'slow';
    } else {
      this.connectionQuality = 'poor';
    }

    this.lastQualityUpdate = Date.now();
  }

  /**
   * Update statistics
   */
  updateStatistics() {
    if (this.responseTimeHistory.length > 0) {
      const recentTimes = this.responseTimeHistory.map(entry => entry.time);
      this.stats.averageResponseTime = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
    }
  }

  /**
   * Determine if a request should be queued
   */
  shouldQueueRequest() {
    // Queue requests if connection quality is poor or if queue already has items
    return this.connectionQuality === 'poor' || this.requestQueue.length > 0;
  }

  /**
   * Clean up timeouts for a completed request
   */
  cleanupTimeouts(requestId) {
    const timeouts = this.activeTimeouts.get(requestId);
    if (timeouts) {
      clearTimeout(timeouts.warningTimeout);
      clearTimeout(timeouts.actualTimeout);
      this.activeTimeouts.delete(requestId);
    }
    this.timeoutWarnings.delete(requestId);
  }

  /**
   * Get connection quality information
   */
  getConnectionQuality() {
    return {
      quality: this.connectionQuality,
      averageResponseTime: this.stats.averageResponseTime,
      lastUpdate: this.lastQualityUpdate,
      recentResponseTimes: this.responseTimeHistory.map(entry => entry.time),
      qualityDescription: this.getQualityDescription(this.connectionQuality)
    };
  }

  /**
   * Get human-readable quality description
   */
  getQualityDescription(quality) {
    const descriptions = {
      excellent: 'Connection is excellent (< 1s response)',
      good: 'Connection is good (< 2s response)',
      slow: 'Connection is slow (< 5s response)',
      poor: 'Connection is poor (> 5s response)',
      unknown: 'Connection quality unknown'
    };
    return descriptions[quality] || descriptions.unknown;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      maxQueueSize: this.config.maxQueueSize,
      queuedRequests: this.requestQueue.map(req => ({
        id: req.id,
        priority: req.priority,
        queuedAt: req.queuedAt,
        waitTime: Date.now() - req.queuedAt
      }))
    };
  }

  /**
   * Get network statistics
   */
  getStatistics() {
    const successRate = this.stats.totalRequests > 0 
      ? (this.stats.successfulRequests / this.stats.totalRequests) * 100 
      : 0;

    return {
      ...this.stats,
      successRate: Math.round(successRate * 100) / 100,
      connectionQuality: this.connectionQuality,
      queueLength: this.requestQueue.length
    };
  }

  /**
   * Clear all queued requests (useful for connection recovery)
   */
  clearQueue(reason = 'Queue cleared') {
    const clearedRequests = this.requestQueue.splice(0);
    clearedRequests.forEach(request => {
      request.reject(new Error(reason));
    });
    this.stopQueueProcessing();
  }

  /**
   * Reset connection quality tracking
   */
  resetQualityTracking() {
    this.responseTimeHistory = [];
    this.connectionQuality = 'unknown';
    this.lastQualityUpdate = null;
  }

  /**
   * Check if there are any active timeout warnings
   */
  hasActiveTimeoutWarnings() {
    return this.timeoutWarnings.size > 0;
  }

  /**
   * Get active timeout warnings
   */
  getActiveTimeoutWarnings() {
    return Array.from(this.timeoutWarnings.keys());
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    this.stopQueueProcessing();
    this.clearQueue('Service shutting down');
    
    // Clear all active timeouts
    for (const [requestId, timeouts] of this.activeTimeouts) {
      this.cleanupTimeouts(requestId);
    }
    
    this.resetQualityTracking();
  }
}

export default NetworkReliabilityManager;