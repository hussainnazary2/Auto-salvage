# Enhanced Ollama Service with Remote Connection Support

This directory contains the enhanced Ollama service implementation that supports remote connections, CORS handling, retry logic, and comprehensive error handling for both local development and production deployments.

## Features

### 🔗 Remote Connection Support
- **CORS Handling**: Automatic CORS configuration for cross-origin requests
- **Connection Health Monitoring**: Periodic health checks with configurable intervals
- **Timeout Management**: Extended timeouts for remote connections
- **Multiple Connection Methods**: Support for direct IP, ngrok, Cloudflare Tunnel, and custom domains

### 🔄 Retry Logic & Error Handling
- **Exponential Backoff**: Intelligent retry mechanism with jitter
- **Error Classification**: Different handling for connection, timeout, CORS, and model errors
- **Graceful Degradation**: Fallback messages when service is unavailable
- **Network Resilience**: Automatic recovery when service comes back online

### 📊 Connection Monitoring
- **Real-time Status**: Live connection status tracking
- **Response Time Monitoring**: Performance metrics for connection quality
- **Model Availability**: Automatic detection of available models
- **Health Check Intervals**: Configurable monitoring frequency

## Files

### OllamaService.js
The main service class that handles all Ollama API interactions with enhanced remote connection support.

**Key Features:**
- Connection health checking
- Message sending with retry logic
- Streaming response handling
- Model management
- CORS configuration
- Error handling and recovery

### ConversationManager.js
Manages conversation history, context, and message formatting for optimal Ollama integration.

**Key Features:**
- Conversation history management
- Context window optimization
- Message formatting for Ollama
- Session management
- Export/import functionality

### OllamaService.test.js
Comprehensive test suite covering all service functionality including error scenarios and edge cases.

## Usage

### Basic Usage

```javascript
import OllamaService from './services/OllamaService.js';
import ConversationManager from './services/ConversationManager.js';

// Initialize services
const ollamaService = new OllamaService();
const conversationManager = new ConversationManager();

// Check connection
const isConnected = await ollamaService.checkConnection();

// Send a message
const response = await ollamaService.sendMessage('Hello', conversationHistory);

// Send with streaming
await ollamaService.sendMessageStream('Hello', conversationHistory, (chunk, fullResponse) => {
  console.log('Received chunk:', chunk);
  console.log('Full response so far:', fullResponse);
});
```

### Connection Status Monitoring

```javascript
// Get current status
const status = ollamaService.getConnectionStatus();
console.log('Status:', status.status); // 'connected', 'disconnected', 'connecting', 'error'
console.log('Available models:', status.availableModels);
console.log('Response time:', status.responseTime);

// Monitor status changes
setInterval(() => {
  const currentStatus = ollamaService.getConnectionStatus();
  updateUI(currentStatus);
}, 5000);
```

### Error Handling

```javascript
try {
  const response = await ollamaService.sendMessage('Hello', []);
} catch (error) {
  if (error instanceof OllamaConnectionError) {
    switch (error.type) {
      case 'connection':
        showError('Connection failed. Please check if Ollama is running.');
        break;
      case 'timeout':
        showError('Request timed out. Please try again.');
        break;
      case 'cors':
        showError('CORS error. Please check Ollama CORS configuration.');
        break;
      case 'model':
        showError('Model not available. Please check model configuration.');
        break;
      case 'network':
        showError('Network error. Please check your connection.');
        break;
    }
  }
}
```

## Configuration

The service uses the ChatbotConfig for all configuration options. Key settings for remote connections:

### Environment Variables

```bash
# Remote Ollama URL (required in production)
REACT_APP_OLLAMA_URL=https://your-ollama-server.com

# CORS mode for remote connections
REACT_APP_CORS_MODE=cors

# Extended timeout for remote connections
REACT_APP_OLLAMA_TIMEOUT=45000

# Retry configuration
REACT_APP_OLLAMA_RETRY_ATTEMPTS=3

# Health check interval
REACT_APP_HEALTH_CHECK_INTERVAL=30000
```

### CORS Configuration

For remote connections, ensure your Ollama server is configured to accept CORS requests:

```bash
# On your PC running Ollama
export OLLAMA_ORIGINS="https://your-app.vercel.app,https://*.vercel.app"
export OLLAMA_HOST=0.0.0.0:11434
```

## Remote Access Setup

### Option 1: ngrok Tunnel
```bash
# Install ngrok and create tunnel
ngrok http 11434

# Use the provided HTTPS URL
REACT_APP_OLLAMA_URL=https://abc123.ngrok.io
```

### Option 2: Cloudflare Tunnel
```bash
# Install cloudflared and create tunnel
cloudflared tunnel create ollama-tunnel
cloudflared tunnel route dns ollama-tunnel ollama.yourdomain.com

# Configure tunnel
REACT_APP_OLLAMA_URL=https://ollama.yourdomain.com
```

### Option 3: Direct IP + Port Forwarding
```bash
# Configure router port forwarding (11434 → PC)
# Set up dynamic DNS if needed
REACT_APP_OLLAMA_URL=http://your-public-ip:11434
```

## Security Considerations

### Network Security
- Always use HTTPS for production deployments
- Configure Ollama to only accept requests from your domain
- Implement rate limiting on the client side
- Validate all inputs before sending to Ollama

### Firewall Configuration
```bash
# Example iptables rules for your PC
iptables -A INPUT -p tcp --dport 11434 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
iptables -A OUTPUT -p tcp --sport 11434 -m conntrack --ctstate ESTABLISHED -j ACCEPT
```

## Performance Optimization

### Connection Pooling
The service reuses connections where possible to minimize overhead.

### Request Debouncing
Rapid-fire requests are handled gracefully with proper queuing.

### Context Management
Conversation history is automatically trimmed to prevent token limit issues.

### Health Check Optimization
Health checks are performed at configurable intervals to balance monitoring with performance.

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure Ollama CORS configuration includes your domain
   - Check that REACT_APP_CORS_MODE is set to 'cors' for production

2. **Connection Timeouts**
   - Increase REACT_APP_OLLAMA_TIMEOUT for slower connections
   - Check network connectivity between Vercel and your PC

3. **Model Not Found**
   - Verify the model name in REACT_APP_OLLAMA_MODEL
   - Check that the model is downloaded and available in Ollama

4. **Health Check Failures**
   - Verify Ollama is running and accessible
   - Check firewall and network configuration

### Debug Mode

Enable debug logging by setting:
```bash
REACT_APP_DEBUG_OLLAMA=true
```

This will provide detailed logging of all service operations.

## Testing

Run the test suite:
```bash
npm test -- --testPathPattern=OllamaService
```

The tests cover:
- Connection management
- Message sending and streaming
- Error handling and recovery
- Retry logic
- CORS handling
- Model management
- Health monitoring

## Contributing

When contributing to the Ollama service:

1. Ensure all new features have corresponding tests
2. Update this README with any new configuration options
3. Follow the existing error handling patterns
4. Test with both local and remote Ollama instances
5. Verify CORS handling works correctly

## License

This service is part of the damaged car business application and follows the same license terms.