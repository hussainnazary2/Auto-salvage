#!/usr/bin/env node

/**
 * React Environment Variables Test
 * Tests that React can load the environment variables correctly
 */

// Simulate React environment loading
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Load environment variables like React does
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config({ path: '.env' });

console.log('🔍 Testing React Environment Variables...\n');

console.log('Environment:', process.env.NODE_ENV);
console.log('');

// Test all React app environment variables
const reactEnvVars = Object.keys(process.env)
  .filter(key => key.startsWith('REACT_APP_'))
  .sort();

if (reactEnvVars.length === 0) {
  console.log('❌ No REACT_APP_ environment variables found!');
  console.log('');
  console.log('🔧 Make sure you have a .env.local file with:');
  console.log('   REACT_APP_OLLAMA_URL=http://localhost:11434');
  console.log('   REACT_APP_OLLAMA_MODEL=mistral-nz-cars');
  console.log('   REACT_APP_CORS_MODE=no-cors');
  process.exit(1);
}

console.log('📋 React App Environment Variables:');
reactEnvVars.forEach(key => {
  const value = process.env[key];
  // Mask sensitive values
  const displayValue = key.includes('URL') && value.includes('://') 
    ? value.replace(/:\/\/.*@/, '://***@') 
    : value;
  console.log(`   ${key}=${displayValue}`);
});

console.log('');

// Test critical configuration
const criticalVars = {
  'REACT_APP_OLLAMA_URL': process.env.REACT_APP_OLLAMA_URL,
  'REACT_APP_OLLAMA_MODEL': process.env.REACT_APP_OLLAMA_MODEL,
  'REACT_APP_CORS_MODE': process.env.REACT_APP_CORS_MODE
};

let hasErrors = false;

console.log('🎯 Critical Configuration Check:');
Object.entries(criticalVars).forEach(([key, value]) => {
  if (value) {
    console.log(`   ✅ ${key}: ${value}`);
  } else {
    console.log(`   ❌ ${key}: NOT SET`);
    hasErrors = true;
  }
});

console.log('');

// Validate configuration
if (criticalVars.REACT_APP_OLLAMA_URL) {
  try {
    const url = new URL(criticalVars.REACT_APP_OLLAMA_URL);
    console.log(`✅ Ollama URL is valid: ${url.protocol}//${url.host}`);
    
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      if (criticalVars.REACT_APP_CORS_MODE === 'cors') {
        console.log('⚠️  WARNING: Using CORS mode with localhost (should be no-cors)');
      } else {
        console.log('✅ CORS mode is appropriate for localhost');
      }
    } else {
      if (criticalVars.REACT_APP_CORS_MODE === 'no-cors') {
        console.log('⚠️  WARNING: Using no-cors mode with remote URL (should be cors)');
      } else {
        console.log('✅ CORS mode is appropriate for remote URL');
      }
    }
  } catch (error) {
    console.log(`❌ Invalid Ollama URL: ${error.message}`);
    hasErrors = true;
  }
}

console.log('');

if (hasErrors) {
  console.log('❌ Configuration has errors. Please fix them before running the app.');
  process.exit(1);
} else {
  console.log('🎉 Environment configuration looks good!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Make sure Ollama is running: ollama serve');
  console.log('2. Start the React app: npm start');
  console.log('3. Test the chatbot connection');
}