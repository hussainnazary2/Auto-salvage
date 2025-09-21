/**
 * Connection Monitor Component Tests
 * Tests for connection status monitoring, visual indicators, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectionMonitor from './ConnectionMonitor.js';

// Mock OllamaService
const createMockOllamaService = (initialStatus = 'disconnected') => ({
  getConnectionStatus: jest.fn(() => ({
    status: initialStatus,
    lastChecked: new Date(),
    availableModels: ['mistral-nz-cars', 'llama2'],
    currentModel: 'mistral-nz-cars',
    error: initialStatus === 'error' ? 'Connection failed' : null,
    responseTime: initialStatus === 'connected' ? 1200 : null
  })),
  checkConnection: jest.fn()
});

describe('ConnectionMonitor', () => {
  let mockOllamaService;
  let mockOnStatusChange;

  beforeEach(() => {
    mockOllamaService = createMockOllamaService();
    mockOnStatusChange = jest.fn();
    jest.clearAllMocks();
  });

  describe('Compact View', () => {
    it('renders compact connection status correctly', () => {
      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={true}
        />
      );

      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('🔴')).toBeInTheDocument();
    });

    it('shows reconnect button in compact view when disconnected', () => {
      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={true}
          showReconnectButton={true}
        />
      );

      const reconnectBtn = screen.getByRole('button');
      expect(reconnectBtn).toBeInTheDocument();
      expect(reconnectBtn).toHaveTextContent('🔄');
    });

    it('handles reconnect button click in compact view', async () => {
      mockOllamaService.checkConnection.mockResolvedValue(true);
      
      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={true}
          showReconnectButton={true}
        />
      );

      const reconnectBtn = screen.getByRole('button');
      fireEvent.click(reconnectBtn);

      await waitFor(() => {
        expect(mockOllamaService.checkConnection).toHaveBeenCalled();
      });
    });
  });

  describe('Full View', () => {
    it('renders full connection status with details', () => {
      mockOllamaService.getConnectionStatus.mockReturnValue({
        status: 'connected',
        lastChecked: new Date(),
        availableModels: ['mistral-nz-cars', 'llama2'],
        currentModel: 'mistral-nz-cars',
        error: null,
        responseTime: 1200
      });

      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={false}
        />
      );

      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Response time: 1200ms')).toBeInTheDocument();
      expect(screen.getByText('mistral-nz-cars')).toBeInTheDocument();
      expect(screen.getByText('2 model(s)')).toBeInTheDocument();
    });

    it('shows connection quality indicator when connected', () => {
      mockOllamaService.getConnectionStatus.mockReturnValue({
        status: 'connected',
        lastChecked: new Date(),
        availableModels: ['mistral-nz-cars'],
        currentModel: 'mistral-nz-cars',
        error: null,
        responseTime: 800 // Good response time
      });

      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={false}
        />
      );

      expect(screen.getByText('Connection Quality:')).toBeInTheDocument();
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('shows error details when connection fails', () => {
      mockOllamaService.getConnectionStatus.mockReturnValue({
        status: 'error',
        lastChecked: new Date(),
        availableModels: [],
        currentModel: 'mistral-nz-cars',
        error: 'Network timeout occurred',
        responseTime: null
      });

      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={false}
        />
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Network timeout occurred')).toBeInTheDocument();
    });
  });

  describe('Status Changes', () => {
    it('calls onStatusChange when status updates', async () => {
      const { rerender } = render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={true}
        />
      );

      // Simulate status change to connected
      mockOllamaService.getConnectionStatus.mockReturnValue({
        status: 'connected',
        lastChecked: new Date(),
        availableModels: ['mistral-nz-cars'],
        currentModel: 'mistral-nz-cars',
        error: null,
        responseTime: 1000
      });

      // Force re-render to trigger status update
      rerender(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={true}
        />
      );

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'connected'
          })
        );
      });
    });

    it('updates visual indicators based on connection status', () => {
      const { rerender } = render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={true}
        />
      );

      // Initially disconnected
      expect(screen.getByText('Offline')).toBeInTheDocument();

      // Change to connecting
      mockOllamaService.getConnectionStatus.mockReturnValue({
        status: 'connecting',
        lastChecked: new Date(),
        availableModels: [],
        currentModel: 'mistral-nz-cars',
        error: null,
        responseTime: null
      });

      rerender(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={true}
        />
      );

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(screen.getByText('🟡')).toBeInTheDocument();
    });
  });

  describe('Reconnection Logic', () => {
    it('handles successful reconnection', async () => {
      mockOllamaService.checkConnection.mockResolvedValue(true);
      mockOllamaService.getConnectionStatus
        .mockReturnValueOnce({
          status: 'disconnected',
          lastChecked: new Date(),
          availableModels: [],
          currentModel: 'mistral-nz-cars',
          error: null,
          responseTime: null
        })
        .mockReturnValueOnce({
          status: 'connected',
          lastChecked: new Date(),
          availableModels: ['mistral-nz-cars'],
          currentModel: 'mistral-nz-cars',
          error: null,
          responseTime: 1000
        });

      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={false}
          showReconnectButton={true}
        />
      );

      const reconnectBtn = screen.getByText('Reconnect');
      fireEvent.click(reconnectBtn);

      await waitFor(() => {
        expect(mockOllamaService.checkConnection).toHaveBeenCalled();
      });
    });

    it('handles failed reconnection', async () => {
      mockOllamaService.checkConnection.mockRejectedValue(new Error('Connection failed'));

      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={false}
          showReconnectButton={true}
        />
      );

      const reconnectBtn = screen.getByText('Reconnect');
      fireEvent.click(reconnectBtn);

      await waitFor(() => {
        expect(mockOllamaService.checkConnection).toHaveBeenCalled();
      });

      // Should still show reconnect button after failed attempt
      expect(screen.getByText('Reconnect')).toBeInTheDocument();
    });

    it('disables reconnect button during reconnection attempt', async () => {
      mockOllamaService.checkConnection.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={false}
          showReconnectButton={true}
        />
      );

      const reconnectBtn = screen.getByText('Reconnect');
      fireEvent.click(reconnectBtn);

      // Button should be disabled and show "Reconnecting..."
      await waitFor(() => {
        expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
      });
    });
  });

  describe('Connection Quality Assessment', () => {
    it('shows excellent quality for fast responses', () => {
      mockOllamaService.getConnectionStatus.mockReturnValue({
        status: 'connected',
        lastChecked: new Date(),
        availableModels: ['mistral-nz-cars'],
        currentModel: 'mistral-nz-cars',
        error: null,
        responseTime: 500 // Fast response
      });

      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={false}
        />
      );

      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('shows poor quality for slow responses', () => {
      mockOllamaService.getConnectionStatus.mockReturnValue({
        status: 'connected',
        lastChecked: new Date(),
        availableModels: ['mistral-nz-cars'],
        currentModel: 'mistral-nz-cars',
        error: null,
        responseTime: 8000 // Slow response
      });

      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={false}
        />
      );

      expect(screen.getByText('Poor')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and titles', () => {
      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={true}
          showReconnectButton={true}
        />
      );

      const reconnectBtn = screen.getByRole('button');
      expect(reconnectBtn).toHaveAttribute('title', 'Reconnect to AI service');
    });

    it('supports keyboard navigation', () => {
      render(
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={mockOnStatusChange}
          compact={false}
          showReconnectButton={true}
        />
      );

      const reconnectBtn = screen.getByText('Reconnect');
      reconnectBtn.focus();
      expect(reconnectBtn).toHaveFocus();
    });
  });
});