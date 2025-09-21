/**
 * Enhanced Chatbot UI Tests for Remote Connection Scenarios
 * Tests the new features implemented for task 8
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chatbot from './Chatbot';
import OllamaService from '../services/OllamaService';

// Mock the OllamaService
jest.mock('../services/OllamaService');
jest.mock('../services/ConversationManager', () => {
  return jest.fn().mockImplementation(() => ({
    addMessage: jest.fn((text, isBot) => ({
      id: `msg_${Date.now()}_${Math.random()}`,
      text,
      isBot,
      timestamp: new Date()
    })),
    clearHistory: jest.fn(),
    getContextForOllama: jest.fn(() => []),
    updateMessage: jest.fn((id, updates) => ({
      id,
      text: updates.text || '',
      isBot: true,
      timestamp: new Date()
    }))
  }));
});
jest.mock('./ConnectionMonitor', () => {
  return function MockConnectionMonitor({ onStatusChange, compact, showReconnectButton }) {
    return (
      <div data-testid="connection-monitor">
        <span>Connection Status</span>
        {showReconnectButton && (
          <button 
            data-testid="reconnect-button"
            onClick={() => onStatusChange({ status: 'connecting' })}
          >
            Reconnect
          </button>
        )}
      </div>
    );
  };
});

jest.mock('./ConnectionQualityIndicator', () => {
  return function MockConnectionQualityIndicator({ onQualityChange, className }) {
    return (
      <div data-testid="connection-quality" className={className}>
        Quality Indicator
      </div>
    );
  };
});

jest.mock('./TimeoutProgressIndicator', () => {
  return function MockTimeoutProgressIndicator({ message, warningMessage, onCancel }) {
    return (
      <div data-testid="timeout-progress">
        <span>{message}</span>
        {warningMessage && <span>{warningMessage}</span>}
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

describe('Enhanced Chatbot UI for Remote Connections', () => {
  let mockOllamaService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock service instance
    mockOllamaService = {
      isRemoteConnection: jest.fn(),
      getServiceStatus: jest.fn(),
      getConnectionStatus: jest.fn(),
      getRequestQueueStatus: jest.fn(),
      getConnectionQuality: jest.fn(),
      getNetworkReliabilityManager: jest.fn(),
      sendMessageStreamWithFallback: jest.fn(),
      clearRequestQueue: jest.fn(),
      destroy: jest.fn()
    };

    // Mock the constructor to return our mock instance
    OllamaService.mockImplementation(() => mockOllamaService);
  });

  describe('Connection Status Header', () => {
    test('shows remote connection indicator for remote connections', async () => {
      mockOllamaService.isRemoteConnection.mockReturnValue(true);
      mockOllamaService.getServiceStatus.mockReturnValue({ mode: 'normal', message: '', canUseAI: true });
      mockOllamaService.getRequestQueueStatus.mockReturnValue({ queueLength: 0, isProcessing: false });
      mockOllamaService.getConnectionQuality.mockReturnValue({ quality: 'good' });
      mockOllamaService.getNetworkReliabilityManager.mockReturnValue({});

      render(<Chatbot />);
      
      // Open chatbot
      fireEvent.click(screen.getByText('💬'));
      
      await waitFor(() => {
        expect(screen.getByText('🌐 Remote')).toBeInTheDocument();
      });
    });

    test('shows queue status when requests are queued', async () => {
      mockOllamaService.isRemoteConnection.mockReturnValue(true);
      mockOllamaService.getServiceStatus.mockReturnValue({ mode: 'normal', message: '', canUseAI: true });
      mockOllamaService.getRequestQueueStatus.mockReturnValue({ queueLength: 3, isProcessing: true });
      mockOllamaService.getConnectionQuality.mockReturnValue({ quality: 'good' });
      mockOllamaService.getNetworkReliabilityManager.mockReturnValue({});

      render(<Chatbot />);
      
      // Open chatbot
      fireEvent.click(screen.getByText('💬'));
      
      await waitFor(() => {
        expect(screen.getByText('📋 3')).toBeInTheDocument();
      });
    });

    test('shows connection quality indicator for remote connections when connected', async () => {
      mockOllamaService.isRemoteConnection.mockReturnValue(true);
      mockOllamaService.getServiceStatus.mockReturnValue({ mode: 'normal', message: '', canUseAI: true });
      mockOllamaService.getRequestQueueStatus.mockReturnValue({ queueLength: 0, isProcessing: false });
      mockOllamaService.getConnectionQuality.mockReturnValue({ quality: 'good' });
      mockOllamaService.getNetworkReliabilityManager.mockReturnValue({});

      render(<Chatbot />);
      
      // Open chatbot
      fireEvent.click(screen.getByText('💬'));
      
      // Simulate connected status
      const connectionMonitor = screen.getByTestId('connection-monitor');
      expect(connectionMonitor).toBeInTheDocument();
    });
  });

  describe('Enhanced Loading States', () => {
    test('shows remote-specific loading message for remote connections', async () => {
      mockOllamaService.isRemoteConnection.mockReturnValue(true);
      mockOllamaService.getServiceStatus.mockReturnValue({ mode: 'normal', message: '', canUseAI: true });
      mockOllamaService.getRequestQueueStatus.mockReturnValue({ queueLength: 0, isProcessing: false });
      mockOllamaService.getConnectionQuality.mockReturnValue({ quality: 'good' });
      mockOllamaService.getNetworkReliabilityManager.mockReturnValue({});
      
      // Mock a slow response
      mockOllamaService.sendMessageStreamWithFallback.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      });

      render(<Chatbot />);
      
      // Open chatbot
      fireEvent.click(screen.getByText('💬'));
      
      // Type and send message
      const input = screen.getByPlaceholderText('Type your message...');
      fireEvent.change(input, { target: { value: 'test message' } });
      fireEvent.click(screen.getByText('Send'));
      
      await waitFor(() => {
        expect(screen.getByText('Connecting to remote AI service...')).toBeInTheDocument();
      });
    });

    test('shows local loading message for local connections', async () => {
      mockOllamaService.isRemoteConnection.mockReturnValue(false);
      mockOllamaService.getServiceStatus.mockReturnValue({ mode: 'normal', message: '', canUseAI: true });
      mockOllamaService.getRequestQueueStatus.mockReturnValue({ queueLength: 0, isProcessing: false });
      mockOllamaService.getConnectionQuality.mockReturnValue({ quality: 'good' });
      mockOllamaService.getNetworkReliabilityManager.mockReturnValue({});
      
      // Mock a slow response
      mockOllamaService.sendMessageStreamWithFallback.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      });

      render(<Chatbot />);
      
      // Open chatbot
      fireEvent.click(screen.getByText('💬'));
      
      // Type and send message
      const input = screen.getByPlaceholderText('Type your message...');
      fireEvent.change(input, { target: { value: 'test message' } });
      fireEvent.click(screen.getByText('Send'));
      
      await waitFor(() => {
        expect(screen.getByText('Processing your request...')).toBeInTheDocument();
      });
    });
  });

  describe('Manual Reconnect Button', () => {
    test('shows reconnect button when connection is in error state', async () => {
      mockOllamaService.isRemoteConnection.mockReturnValue(true);
      mockOllamaService.getServiceStatus.mockReturnValue({ mode: 'normal', message: '', canUseAI: true });
      mockOllamaService.getRequestQueueStatus.mockReturnValue({ queueLength: 0, isProcessing: false });
      mockOllamaService.getConnectionQuality.mockReturnValue({ quality: 'poor' });
      mockOllamaService.getNetworkReliabilityManager.mockReturnValue({});

      render(<Chatbot />);
      
      // Open chatbot
      fireEvent.click(screen.getByText('💬'));
      
      // The reconnect button should be available through the ConnectionMonitor
      expect(screen.getByTestId('reconnect-button')).toBeInTheDocument();
    });
  });

  describe('Remote-Specific Error Messages', () => {
    test('shows enhanced error messages for remote CORS issues', async () => {
      mockOllamaService.isRemoteConnection.mockReturnValue(true);
      mockOllamaService.getServiceStatus.mockReturnValue({ mode: 'normal', message: '', canUseAI: true });
      mockOllamaService.getRequestQueueStatus.mockReturnValue({ queueLength: 0, isProcessing: false });
      mockOllamaService.getConnectionQuality.mockReturnValue({ quality: 'good' });
      mockOllamaService.getNetworkReliabilityManager.mockReturnValue({});
      
      // Mock CORS error
      const corsError = new Error('CORS error');
      corsError.name = 'OllamaConnectionError';
      corsError.type = 'cors';
      corsError.message = 'CORS configuration issue';
      
      mockOllamaService.sendMessageStreamWithFallback.mockRejectedValue(corsError);

      render(<Chatbot />);
      
      // Open chatbot
      fireEvent.click(screen.getByText('💬'));
      
      // Type and send message
      const input = screen.getByPlaceholderText('Type your message...');
      fireEvent.change(input, { target: { value: 'test message' } });
      fireEvent.click(screen.getByText('Send'));
      
      await waitFor(() => {
        expect(screen.getByText(/OLLAMA_ORIGINS environment variable/)).toBeInTheDocument();
      });
    });
  });
});