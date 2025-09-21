/**
 * Connection Monitor Integration Tests
 * Tests the integration between ConnectionMonitor and Chatbot components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chatbot from './Chatbot.js';

// Mock the OllamaService
jest.mock('../services/OllamaService.js', () => {
  const mockService = {
    getConnectionStatus: jest.fn(() => ({
      status: 'disconnected',
      lastChecked: new Date(),
      availableModels: [],
      currentModel: 'mistral-nz-cars',
      error: null,
      responseTime: null
    })),
    checkConnection: jest.fn(),
    sendMessageStream: jest.fn(),
    destroy: jest.fn()
  };

  return {
    __esModule: true,
    default: jest.fn(() => mockService),
    OllamaConnectionError: class extends Error {
      constructor(message, type) {
        super(message);
        this.type = type;
      }
    }
  };
});

// Mock ConversationManager
jest.mock('../services/ConversationManager.js', () => {
  return jest.fn().mockImplementation(() => ({
    addMessage: jest.fn((text, isBot) => ({
      id: Math.random().toString(),
      text,
      isBot,
      timestamp: new Date()
    })),
    clearHistory: jest.fn(),
    getContextForOllama: jest.fn(() => []),
    updateMessage: jest.fn()
  }));
});

describe('ConnectionMonitor Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display connection status in chatbot header', async () => {
    render(<Chatbot />);
    
    // Open the chatbot
    const chatbotButton = screen.getByRole('button', { name: /💬|×/ });
    fireEvent.click(chatbotButton);
    
    // Should show connection status in header
    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  it('should show connection details when info button is clicked', async () => {
    render(<Chatbot />);
    
    // Open the chatbot
    const chatbotButton = screen.getByRole('button', { name: /💬|×/ });
    fireEvent.click(chatbotButton);
    
    // Click the connection details button
    const infoButton = screen.getByTitle('Toggle connection details');
    fireEvent.click(infoButton);
    
    // Should show detailed connection information
    await waitFor(() => {
      expect(screen.getByText('Last checked:')).toBeInTheDocument();
      expect(screen.getByText('Model:')).toBeInTheDocument();
    });
  });

  it('should handle reconnection attempts from the UI', async () => {
    const OllamaService = require('../services/OllamaService.js').default;
    const mockInstance = new OllamaService();
    
    render(<Chatbot />);
    
    // Open the chatbot
    const chatbotButton = screen.getByRole('button', { name: /💬|×/ });
    fireEvent.click(chatbotButton);
    
    // Find and click reconnect button
    const reconnectButton = screen.getByTitle('Reconnect to AI service');
    fireEvent.click(reconnectButton);
    
    // Should attempt to check connection
    await waitFor(() => {
      expect(mockInstance.checkConnection).toHaveBeenCalled();
    });
  });

  it('should update status when connection changes', async () => {
    const OllamaService = require('../services/OllamaService.js').default;
    const mockInstance = new OllamaService();
    
    // Start with disconnected status
    mockInstance.getConnectionStatus.mockReturnValue({
      status: 'disconnected',
      lastChecked: new Date(),
      availableModels: [],
      currentModel: 'mistral-nz-cars',
      error: null,
      responseTime: null
    });
    
    const { rerender } = render(<Chatbot />);
    
    // Open the chatbot
    const chatbotButton = screen.getByRole('button', { name: /💬|×/ });
    fireEvent.click(chatbotButton);
    
    // Should show offline status
    expect(screen.getByText('Offline')).toBeInTheDocument();
    
    // Change to connected status
    mockInstance.getConnectionStatus.mockReturnValue({
      status: 'connected',
      lastChecked: new Date(),
      availableModels: ['mistral-nz-cars'],
      currentModel: 'mistral-nz-cars',
      error: null,
      responseTime: 1200
    });
    
    // Force re-render
    rerender(<Chatbot />);
    
    // Should eventually show online status
    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show error status when connection fails', async () => {
    const OllamaService = require('../services/OllamaService.js').default;
    const mockInstance = new OllamaService();
    
    // Set error status
    mockInstance.getConnectionStatus.mockReturnValue({
      status: 'error',
      lastChecked: new Date(),
      availableModels: [],
      currentModel: 'mistral-nz-cars',
      error: 'Connection timeout',
      responseTime: null
    });
    
    render(<Chatbot />);
    
    // Open the chatbot
    const chatbotButton = screen.getByRole('button', { name: /💬|×/ });
    fireEvent.click(chatbotButton);
    
    // Should show error status
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
    
    // Click to show details
    const infoButton = screen.getByTitle('Toggle connection details');
    fireEvent.click(infoButton);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    });
  });
});