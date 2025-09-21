/**
 * Tests for ConnectionQualityIndicator component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectionQualityIndicator from './ConnectionQualityIndicator.js';

// Mock NetworkReliabilityManager
const mockNetworkManager = {
  getConnectionQuality: jest.fn(),
  getQueueStatus: jest.fn(),
  getStatistics: jest.fn()
};

describe('ConnectionQualityIndicator', () => {
  beforeEach(() => {
    // Reset mocks
    mockNetworkManager.getConnectionQuality.mockReturnValue({
      quality: 'good',
      averageResponseTime: 1500,
      qualityDescription: 'Connection is good (< 2s response)',
      recentResponseTimes: [1200, 1500, 1800]
    });

    mockNetworkManager.getQueueStatus.mockReturnValue({
      queueLength: 0,
      isProcessing: false,
      queuedRequests: []
    });

    mockNetworkManager.getStatistics.mockReturnValue({
      totalRequests: 10,
      successfulRequests: 9,
      failedRequests: 1,
      timeoutRequests: 0,
      successRate: 90
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders connection quality indicator', () => {
    render(<ConnectionQualityIndicator networkManager={mockNetworkManager} />);
    
    expect(screen.getByText('1.5s')).toBeInTheDocument();
  });

  test('displays correct quality icon for different states', () => {
    const { rerender } = render(<ConnectionQualityIndicator networkManager={mockNetworkManager} />);
    
    // Good quality should show yellow icon
    expect(screen.getByText('🟡')).toBeInTheDocument();
    
    // Change to excellent quality
    mockNetworkManager.getConnectionQuality.mockReturnValue({
      quality: 'excellent',
      averageResponseTime: 500,
      qualityDescription: 'Connection is excellent (< 1s response)'
    });
    
    rerender(<ConnectionQualityIndicator networkManager={mockNetworkManager} />);
    expect(screen.getByText('🟢')).toBeInTheDocument();
  });

  test('shows queue indicator when requests are queued', () => {
    mockNetworkManager.getQueueStatus.mockReturnValue({
      queueLength: 3,
      isProcessing: true,
      queuedRequests: []
    });

    render(<ConnectionQualityIndicator networkManager={mockNetworkManager} />);
    
    expect(screen.getByText('📋 3')).toBeInTheDocument();
  });

  test('expands details when showDetails is true and clicked', async () => {
    render(<ConnectionQualityIndicator networkManager={mockNetworkManager} showDetails={true} />);
    
    // Click to expand
    fireEvent.click(screen.getByText('1.5s'));
    
    await waitFor(() => {
      expect(screen.getByText('Connection Quality')).toBeInTheDocument();
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });
  });

  test('displays detailed statistics when expanded', async () => {
    render(<ConnectionQualityIndicator networkManager={mockNetworkManager} showDetails={true} />);
    
    // Click to expand
    fireEvent.click(screen.getByText('1.5s'));
    
    await waitFor(() => {
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument(); // Success rate
      expect(screen.getByText('10')).toBeInTheDocument(); // Total requests
    });
  });

  test('shows queue details when queue has items', async () => {
    mockNetworkManager.getQueueStatus.mockReturnValue({
      queueLength: 2,
      isProcessing: true,
      queuedRequests: [
        { id: 'req1', priority: 'normal', waitTime: 1000 },
        { id: 'req2', priority: 'high', waitTime: 500 }
      ]
    });

    render(<ConnectionQualityIndicator networkManager={mockNetworkManager} showDetails={true} />);
    
    // Click to expand
    fireEvent.click(screen.getByText('1.5s'));
    
    await waitFor(() => {
      expect(screen.getByText('Request Queue')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Queue length
      expect(screen.getByText('Yes')).toBeInTheDocument(); // Processing status
    });
  });

  test('calls onQualityChange when quality updates', async () => {
    const onQualityChange = jest.fn();
    
    render(
      <ConnectionQualityIndicator 
        networkManager={mockNetworkManager} 
        onQualityChange={onQualityChange}
      />
    );
    
    await waitFor(() => {
      expect(onQualityChange).toHaveBeenCalledWith('good', 1500);
    });
  });

  test('handles unknown quality state', () => {
    mockNetworkManager.getConnectionQuality.mockReturnValue({
      quality: 'unknown',
      averageResponseTime: 0,
      qualityDescription: 'Connection quality unknown'
    });

    render(<ConnectionQualityIndicator networkManager={mockNetworkManager} />);
    
    expect(screen.getByText('Checking...')).toBeInTheDocument();
    expect(screen.getByText('⚪')).toBeInTheDocument();
  });

  test('formats response times correctly', () => {
    const { rerender } = render(<ConnectionQualityIndicator networkManager={mockNetworkManager} />);
    
    // Test milliseconds
    mockNetworkManager.getConnectionQuality.mockReturnValue({
      quality: 'excellent',
      averageResponseTime: 500,
      qualityDescription: 'Connection is excellent'
    });
    
    rerender(<ConnectionQualityIndicator networkManager={mockNetworkManager} />);
    expect(screen.getByText('500ms')).toBeInTheDocument();
    
    // Test seconds
    mockNetworkManager.getConnectionQuality.mockReturnValue({
      quality: 'slow',
      averageResponseTime: 3500,
      qualityDescription: 'Connection is slow'
    });
    
    rerender(<ConnectionQualityIndicator networkManager={mockNetworkManager} />);
    expect(screen.getByText('3.5s')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <ConnectionQualityIndicator 
        networkManager={mockNetworkManager} 
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('connection-quality-indicator', 'custom-class');
  });

  test('handles compact mode', () => {
    const { container } = render(
      <ConnectionQualityIndicator 
        networkManager={mockNetworkManager} 
        className="compact"
      />
    );
    
    expect(container.firstChild).toHaveClass('compact');
  });

  test('updates periodically', async () => {
    jest.useFakeTimers();
    
    render(<ConnectionQualityIndicator networkManager={mockNetworkManager} />);
    
    // Initial call
    expect(mockNetworkManager.getConnectionQuality).toHaveBeenCalledTimes(1);
    
    // Fast forward 2 seconds
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(mockNetworkManager.getConnectionQuality).toHaveBeenCalledTimes(2);
    });
    
    jest.useRealTimers();
  });

  test('cleans up interval on unmount', () => {
    jest.useFakeTimers();
    
    const { unmount } = render(<ConnectionQualityIndicator networkManager={mockNetworkManager} />);
    
    unmount();
    
    // Fast forward time - should not cause additional calls
    const initialCalls = mockNetworkManager.getConnectionQuality.mock.calls.length;
    jest.advanceTimersByTime(5000);
    
    expect(mockNetworkManager.getConnectionQuality).toHaveBeenCalledTimes(initialCalls);
    
    jest.useRealTimers();
  });
});