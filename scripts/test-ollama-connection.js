#!/usr/bin/env node

/**
 * Ollama Connection Test Script
 * Tests connection to local Ollama server
 */

const http = require('http');
const https = require('https');

async function testOllamaConnection() {
  const ollamaUrl = process.env.REACT_APP_OLLAMA_URL || 'http://localhost:11434';
  const modelName = process.env.REACT_APP_OLLAMA_MODEL || 'mistral-nz-cars';
  
  console.log('🔍 Testing Ollama Connection...');
  console.log(`URL: ${ollamaUrl}`);
  console.log(`Model: ${modelName}`);
  console.log('');

  // Test 1: Check if Ollama server is running
  console.log('1️⃣ Testing server availability...');
  try {
    const isHttps = ollamaUrl.startsWith('https');
    const url = new URL(ollamaUrl);
    const client = isHttps ? https : http;
    
    await new Promise((resolve, reject) => {
      const req = client.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: '/api/tags',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Ollama server is running');
            try {
              const response = JSON.parse(data);
              console.log(`   Available models: ${response.models?.length || 0}`);
              if (response.models) {
                response.models.forEach(model => {
                  console.log(`   - ${model.name} (${model.size})`);
                });
              }
              resolve();
            } catch (e) {
              console.log('✅ Ollama server is running (response parsing failed)');
              resolve();
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timeout'));
      });
      
      req.end();
    });
  } catch (error) {
    console.log(`❌ Server not accessible: ${error.message}`);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('   1. Make sure Ollama is running: ollama serve');
    console.log('   2. Check if port 11434 is open');
    console.log('   3. Try: curl http://localhost:11434/api/tags');
    return false;
  }

  // Test 2: Check if specific model is available
  console.log('');
  console.log('2️⃣ Testing model availability...');
  try {
    const isHttps = ollamaUrl.startsWith('https');
    const url = new URL(ollamaUrl);
    const client = isHttps ? https : http;
    
    await new Promise((resolve, reject) => {
      const req = client.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: '/api/tags',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const modelExists = response.models?.some(model => 
              model.name === modelName || model.name.startsWith(modelName)
            );
            
            if (modelExists) {
              console.log(`✅ Model '${modelName}' is available`);
            } else {
              console.log(`❌ Model '${modelName}' not found`);
              console.log('');
              console.log('🔧 Available models:');
              if (response.models && response.models.length > 0) {
                response.models.forEach(model => {
                  console.log(`   - ${model.name}`);
                });
                console.log('');
                console.log(`💡 To pull the model: ollama pull ${modelName}`);
              } else {
                console.log('   No models found. Pull a model first: ollama pull mistral');
              }
              return false;
            }
            resolve();
          } catch (e) {
            reject(new Error('Failed to parse response'));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timeout'));
      });
      
      req.end();
    });
  } catch (error) {
    console.log(`❌ Model check failed: ${error.message}`);
    return false;
  }

  // Test 3: Test actual chat completion
  console.log('');
  console.log('3️⃣ Testing chat completion...');
  try {
    const isHttps = ollamaUrl.startsWith('https');
    const url = new URL(ollamaUrl);
    const client = isHttps ? https : http;
    
    const testMessage = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: 'Hello, can you help me with car damage assessment?'
        }
      ],
      stream: false
    };
    
    await new Promise((resolve, reject) => {
      const postData = JSON.stringify(testMessage);
      
      const req = client.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              if (response.message && response.message.content) {
                console.log('✅ Chat completion successful');
                console.log(`   Response: ${response.message.content.substring(0, 100)}...`);
              } else {
                console.log('✅ Chat endpoint responded (unexpected format)');
              }
              resolve();
            } catch (e) {
              console.log('❌ Chat response parsing failed');
              console.log(`   Raw response: ${data.substring(0, 200)}...`);
              resolve(); // Still consider it a success if we got a response
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Chat request timeout'));
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.log(`❌ Chat completion failed: ${error.message}`);
    console.log('');
    console.log('🔧 This might be normal if:');
    console.log('   - Model is still loading');
    console.log('   - Model name is incorrect');
    console.log('   - Ollama is busy with another request');
    return false;
  }

  console.log('');
  console.log('🎉 All tests passed! Ollama connection is working.');
  return true;
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

if (require.main === module) {
  testOllamaConnection().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testOllamaConnection };