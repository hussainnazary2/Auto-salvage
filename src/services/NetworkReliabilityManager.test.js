/**
 * Tests for NetworkReliabilityManager
 */

import NetworkReliabilityManager from './NetworkReliabilityManager.js';

describe('NetworkReliabilityManager', () => {
  let manager;

  beforeEach(() => {
    manager = new NetworkReliabilityManager({
      maxQueueSize: 5,
      connectionQualityWindow: 3,
      slowConnectionThreshold: 2000,
      verySlowConnectionThreshold: 5000,
      queueProcessingInterval: 100
    });
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe('Request Execution', () => {
    test('should execute request successfully', async () => {
      const mockRequest = jest.fn().mockResolvedValue('success');
      
      const result = await manager.executeRequest('test1', mockRequest);
      
      expect(result).toBe('success');
      expect(mockRequest).toHaveBeenCalledWith(expect.any(AbortSignal));
    });

    test('should handle request timeout', async () => {
      const mockRequest = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('late'), 200))
      );
      
      await expect(
        manager.executeRequest('test2', mockRequest, { timeout: 100 })
      ).rejects.toThrow();
    });

    test('should track response times', async () => {
      const mockRequest = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 100))
      );
      
      await manager.executeRequest('test3', mockRequest);
      
      const quality = manager.getConnectionQuality();
      expect(quality.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Connection Quality', () => {
    test('should start with unknown quality', () => {
      const quality = manager.getConnectionQuality();
      expect(quality.quality).toBe('unknown');
    });

    test('should update quality based on response times', async () => {
      // Simulate fast responses
      manager.recordResponseTime(500);
      manager.recordResponseTime(600);
      manager.recordResponseTime(700);
      
      const quality = manager.getConnectionQuality();
      expect(quality.quality).toBe('excellent');
    });

    test('should detect slow connections', async () => {
      // Simulate slow responses
      manager.recordResponseTime(3000);
      manager.recordResponseTime(3500);
      manager.recordResponseTime(4000);
      
      const quality = manager.getConnectionQuality();
      expect(quality.quality).toBe('slow');
    });

    test('should detect poor connections', async () => {
      // Simulate very slow responses
      manager.recordResponseTime(6000);
      manager.recordResponseTime(7000);
      manager.recordResponseTime(8000);
      
      const quality = manager.getConnectionQuality();
      expect(quality.quality).toBe('poor');
    });
  });

  describe('Request Queuing', () => {
    test('should queue requests when connection is poor', async () => {
      // Set poor connection quality
      manager.recordResponseTime(8000);
      manager.recordResponseTime(9000);
      manager.recordResponseTime(10000);
      
      const mockRequest = jest.fn().mockResolvedValue('queued');
      
      // This should be queued
      const promise = manager.executeRequest('test4', mockRequest, { priority: 'normal' });
      
      const queueStatus = manager.getQueueStatus();
      expect(queueStatus.queueLength).toBe(1);
      
      // Clean up
      manager.clearQueue();
    });

    test('should process high priority requests immediately', async () => {
      // Set poor connection quality
      manager.recordResponseTime(8000);
      manager.recordResponseTime(9000);
      manager.recordResponseTime(10000);
      
      const mockRequest = jest.fn().mockResolvedValue('priority');
      
      // High priority should not be queued
      const result = await manager.executeRequest('test5', mockRequest, { priority: 'high' });
      
      expect(result).toBe('priority');
      expect(mockRequest).toHaveBeenCalled();
    });

    test('should respect queue size limits', async () => {
      // Fill the queue
      const promises = [];
      for (let i = 0; i < 6; i++) {
        const mockRequest = jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(`result${i}`), 1000))
        );
        
        try {
          promises.push(manager.executeRequest(`test${i}`, mockRequest, { priority: 'low' }));
        } catch (error) {
          // Expected for the 6th request (exceeds maxQueueSize of 5)
          expect(error.message).toContain('queue is full');
        }
      }
      
      const queueStatus = manager.getQueueStatus();
      expect(queueStatus.queueLength).toBeLessThanOrEqual(5);
      
      // Clean up
      manager.clearQueue();
    });
  });

  describe('Statistics', () => {
    test('should track request statistics', async () => {
      const mockRequest1 = jest.fn().mockResolvedValue('success');
      const mockRequest2 = jest.fn().mockRejectedValue(new Error('failed'));
      
      await manager.executeRequest('test6', mockRequest1);
      
      try {
        await manager.executeRequest('test7', mockRequest2);
      } catch (error) {
        // Expected
      }
      
      const stats = manager.getStatistics();
      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(1);
    });

    test('should calculate success rate correctly', async () => {
      const mockSuccess = jest.fn().mockResolvedValue('success');
      const mockFailure = jest.fn().mockRejectedValue(new Error('failed'));
      
      // 3 successes, 1 failure = 75% success rate
      await manager.executeRequest('s1', mockSuccess);
      await manager.executeRequest('s2', mockSuccess);
      await manager.executeRequest('s3', mockSuccess);
      
      try {
        await manager.executeRequest('f1', mockFailure);
      } catch (error) {
        // Expected
      }
      
      const stats = manager.getStatistics();
      expect(stats.successRate).toBe(75);
    });
  });

  describe('Timeout Management', () => {
    test('should handle timeout warnings', (done) => {
      const mockRequest = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('late'), 300))
      );
      
      let warningReceived = false;
      
      manager.executeRequest('test8', mockRequest, {
        timeout: 200,
        onTimeout: (type) => {
          if (type === 'warning') {
            warningReceived = true;
          }
        }
      }).catch(() => {
        expect(warningReceived).toBe(true);
        done();
      });
    });

    test('should track active timeout warnings', async () => {
      const mockRequest = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 50))
      );
      
      const promise = manager.executeRequest('test9', mockRequest, {
        timeout: 100,
        onTimeout: () => {}
      });
      
      // Check if warnings are tracked (this is implementation dependent)
      await promise;
      
      expect(manager.hasActiveTimeoutWarnings()).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources properly', () => {
      manager.recordResponseTime(1000);
      
      const queueStatus = manager.getQueueStatus();
      const quality = manager.getConnectionQuality();
      
      expect(queueStatus.queueLength).toBe(0);
      expect(quality.quality).toBe('excellent');
      
      manager.cleanup();
      
      // After cleanup, should be reset
      const cleanedQuality = manager.getConnectionQuality();
      expect(cleanedQuality.quality).toBe('unknown');
    });
  });
});