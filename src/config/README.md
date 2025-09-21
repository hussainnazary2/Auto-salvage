# Chatbot Configuration System

This configuration system provides environment-specific settings for the Ollama chatbot integration, supporting both local development and production deployment scenarios.

## Features

- **Environment-aware configuration**: Automatically adapts settings based on NODE_ENV
- **Environment variable loading**: Loads configuration from environment variables with sensible fallbacks
- **Comprehensive validation**: Validates all configuration values with helpful error messages
- **Type conversion**: Automatically converts string environment variables to appropriate types
- **Runtime updates**: Supports configuration updates during runtime
- **Production-ready**: Handles remote Ollama connections for Vercel deployment

## Quick Start

### Basic Usage

```javascript
import config from './config';

// Get the full configuration
const fullConfig = config.getConfig();

// Get specific sections
const ollamaConfig = config.getOllamaConfig();
const chatConfig = config.getChatConfig();
const uiConfig = config.getUIConfig();
const networkConfig = config.getNetworkConfig();
```

### Using with React Components

```javascript
import React, { useEffect, useState } from 'react';
import config from '../config';

function ChatbotComponent() {
  const [ollamaUrl, setOllamaUrl] = useState('');
  
  useEffect(() => {
    try {
      const ollamaConfig = config.getOllamaConfig();
      setOllamaUrl(ollamaConfig.baseUrl);
    } catch (error) {
      console.error('Configuration error:', error);
    }
  }, []);

  // ... rest of component
}
```

## Environment Variables

### Required Variables

- **Production**: `REACT_APP_OLLAMA_URL` is required when NODE_ENV=production

### Optional Variables

All variables have sensible defaults:

```bash
# Ollama Configuration
REACT_APP_OLLAMA_URL=http://localhost:11434
REACT_APP_OLLAMA_MODEL=mistral-nz-cars
REACT_APP_OLLAMA_TIMEOUT=30000
REACT_APP_OLLAMA_RETRY_ATTEMPTS=3
REACT_APP_CORS_MODE=cors

# Model Parameters
REACT_APP_OLLAMA_TEMPERATURE=0.7
REACT_APP_OLLAMA_MAX_TOKENS=2048
REACT_APP_OLLAMA_TOP_P=0.9

# Chat Settings
REACT_APP_CHAT_MAX_HISTORY=10
REACT_APP_SYSTEM_PROMPT="Custom system prompt..."

# UI Settings
REACT_APP_SHOW_CONNECTION_STATUS=true
REACT_APP_ENABLE_MODEL_SELECTION=false
REACT_APP_TYPING_DELAY=500
REACT_APP_MAX_RETRY_ATTEMPTS=3
REACT_APP_RETRY_DELAY=2000

# Network Settings
REACT_APP_HEALTH_CHECK_INTERVAL=30000
REACT_APP_CORS_PROXY=https://cors-proxy.example.com
REACT_APP_USE_PROXY=false
```

## Environment-Specific Defaults

### Development (NODE_ENV=development)
- Ollama URL: `http://localhost:11434`
- CORS Mode: `no-cors`
- Timeout: `30000ms`

### Production (NODE_ENV=production)
- Ollama URL: **Must be explicitly set**
- CORS Mode: `cors`
- Timeout: `45000ms` (longer for remote connections)

## Configuration Validation

The system validates all configuration values and provides helpful error messages:

### URL Validation
```javascript
// ✅ Valid URLs
REACT_APP_OLLAMA_URL=http://localhost:11434
REACT_APP_OLLAMA_URL=https://ollama.example.com
REACT_APP_OLLAMA_URL=https://abc123.ngrok.io

// ❌ Invalid URLs
REACT_APP_OLLAMA_URL=invalid-url
REACT_APP_OLLAMA_URL=localhost:11434  // Missing protocol
```

### Numeric Validation
```javascript
// ✅ Valid values
REACT_APP_OLLAMA_TIMEOUT=30000
REACT_APP_OLLAMA_TEMPERATURE=0.7

// ❌ Invalid values
REACT_APP_OLLAMA_TIMEOUT=500        // Too low (min 1000ms)
REACT_APP_OLLAMA_TEMPERATURE=3.0    // Too high (max 2.0)
```

### Boolean Validation
```javascript
// ✅ Valid boolean values
REACT_APP_SHOW_CONNECTION_STATUS=true
REACT_APP_USE_PROXY=false
REACT_APP_ENABLE_MODEL_SELECTION=1    // Converted to true
REACT_APP_SHOW_CONNECTION_STATUS=yes  // Converted to true

// ❌ Invalid boolean values
REACT_APP_USE_PROXY=maybe
REACT_APP_SHOW_CONNECTION_STATUS=invalid
```

## Error Handling

### Configuration Errors

```javascript
import config, { ConfigurationError } from './config';

try {
  const ollamaConfig = config.getOllamaConfig();
  // Use configuration...
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Configuration error:', error.message);
    console.error('Field:', error.field);
    
    // Get all validation errors
    const errors = config.getValidationErrors();
    console.error('All errors:', errors);
  }
}
```

### Checking Configuration Status

```javascript
import config from './config';

// Check if configuration is valid
if (config.isValid()) {
  // Safe to use configuration
  const ollamaConfig = config.getOllamaConfig();
} else {
  // Handle invalid configuration
  const errors = config.getValidationErrors();
  console.error('Configuration errors:', errors);
}
```

## Runtime Configuration Updates

```javascript
import config from './config';

// Update configuration at runtime
try {
  config.updateConfig({
    ollama: {
      baseUrl: 'https://new-ollama-url.com',
      timeout: 60000
    },
    ui: {
      showConnectionStatus: false
    }
  });
  
  console.log('Configuration updated successfully');
} catch (error) {
  console.error('Failed to update configuration:', error);
}
```

## Deployment Examples

### Local Development
```bash
# .env.local
REACT_APP_OLLAMA_URL=http://localhost:11434
REACT_APP_OLLAMA_MODEL=mistral-nz-cars
```

### Vercel Production (ngrok tunnel)
```bash
# Vercel environment variables
REACT_APP_OLLAMA_URL=https://abc123.ngrok.io
REACT_APP_OLLAMA_MODEL=mistral-nz-cars
REACT_APP_CORS_MODE=cors
REACT_APP_OLLAMA_TIMEOUT=45000
```

### Vercel Production (Cloudflare Tunnel)
```bash
# Vercel environment variables
REACT_APP_OLLAMA_URL=https://ollama.yourdomain.com
REACT_APP_OLLAMA_MODEL=mistral-nz-cars
REACT_APP_CORS_MODE=cors
REACT_APP_OLLAMA_TIMEOUT=45000
```

## Debugging

### Configuration Summary
```javascript
import config from './config';

// Get a summary of current configuration
const summary = config.getConfigSummary();
console.log('Configuration summary:', summary);

// Output:
// {
//   environment: 'development',
//   ollamaUrl: 'http://localhost:11434',
//   model: 'mistral-nz-cars',
//   timeout: 30000,
//   corsMode: 'no-cors',
//   useProxy: false,
//   showConnectionStatus: true
// }
```

### Validation Errors
```javascript
import config from './config';

if (!config.isValid()) {
  const errors = config.getValidationErrors();
  console.error('Configuration validation failed:');
  errors.forEach(error => console.error('- ' + error));
}
```

## Best Practices

1. **Always check configuration validity** before using it in production code
2. **Use environment-specific .env files** for different deployment scenarios
3. **Set required variables in production** - don't rely on defaults for critical settings
4. **Validate configuration early** in your application startup
5. **Handle configuration errors gracefully** with user-friendly messages
6. **Use the configuration summary** for debugging deployment issues

## Integration with Existing Code

To integrate this configuration system with existing chatbot code:

```javascript
// Before (hardcoded values)
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'mistral-nz-cars',
    prompt: conversationHistory,
    stream: true
  })
});

// After (using configuration)
import config from '../config';

const ollamaConfig = config.getOllamaConfig();
const response = await fetch(`${ollamaConfig.baseUrl}/api/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: ollamaConfig.model,
    prompt: conversationHistory,
    stream: true,
    options: {
      temperature: ollamaConfig.parameters.temperature,
      num_predict: ollamaConfig.parameters.max_tokens,
      top_p: ollamaConfig.parameters.top_p
    }
  })
});
```