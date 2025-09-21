/**
 * Connection Monitor Demo Component
 * Simple demo to test ConnectionMonitor functionality
 */

import React, { useState } from 'react';
import ConnectionMonitor from './ConnectionMonitor.js';

const ConnectionMonitorDemo = () => {
  const [mockStatus, setMockStatus] = useState('disconnected');
  
  // Mock OllamaService for demo
  const mockOllamaService = {
    getConnectionStatus: () => ({
      status: mockStatus,
      lastChecked: new Date(),
      availableModels: mockStatus === 'connected' ? ['mistral-nz-cars', 'llama2'] : [],
      currentModel: 'mistral-nz-cars',
      error: mockStatus === 'error' ? 'Connection timeout occurred' : null,
      responseTime: mockStatus === 'connected' ? 1200 : null
    }),
    checkConnection: async () => {
      console.log('Mock checkConnection called');
      // Simulate connection attempt
      setMockStatus('connecting');
      setTimeout(() => {
        setMockStatus(Math.random() > 0.5 ? 'connected' : 'error');
      }, 1000);
    }
  };

  const handleStatusChange = (status) => {
    console.log('Status changed:', status);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Connection Monitor Demo</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Manual Status Control:</h3>
        <button onClick={() => setMockStatus('disconnected')}>Set Disconnected</button>
        <button onClick={() => setMockStatus('connecting')}>Set Connecting</button>
        <button onClick={() => setMockStatus('connected')}>Set Connected</button>
        <button onClick={() => setMockStatus('error')}>Set Error</button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Compact View:</h3>
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={handleStatusChange}
          compact={true}
          showReconnectButton={true}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Full View:</h3>
        <ConnectionMonitor 
          ollamaService={mockOllamaService}
          onStatusChange={handleStatusChange}
          compact={false}
          showReconnectButton={true}
        />
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <h4>Current Mock Status: {mockStatus}</h4>
        <p>Use the buttons above to change the connection status and see how the ConnectionMonitor responds.</p>
      </div>
    </div>
  );
};

export default ConnectionMonitorDemo;