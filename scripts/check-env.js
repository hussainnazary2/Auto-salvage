#!/usr/bin/env node

/**
 * Environment Variable Validation Script for Vercel Deployment
 * Checks required environment variables and provides helpful error messages
 */

const fs = require('fs');
const path = require('path');

// Required environment variables for production
const REQUIRED_VARS = [
  'REACT_APP_OLLAMA_URL'
];

// Optional but recommended variables
const RECOMMENDED_VARS = [
  'REACT_APP_OLLAMA_MODEL',
  'REACT_APP_CORS_MODE'
];

// Environment-specific defaults
const DEFAULTS = {
  development: {
    REACT_APP_OLLAMA_URL: 'http://localhost:11434',
    REACT_APP_OLLAMA_MODEL: 'mistral-nz-cars',
    REACT_APP_CORS_MODE: 'no-cors',
    REACT_APP_OLLAMA_TIMEOUT: '30000'
  },
  production: {
    REACT_APP_OLLAMA_MODEL: 'mistral-nz-cars',
    REACT_APP_CORS_MODE: 'cors',
    REACT_APP_OLLAMA_TIMEOUT: '45000'
  }
};

function checkEnvironmentVariables() {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  
  console.log(`🔍 Checking environment variables for ${env} environment...`);
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // Check required variables
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      if (isProduction) {
        console.error(`❌ ERROR: Required environment variable ${varName} is not set`);
        hasErrors = true;
      } else {
        const defaultValue = DEFAULTS[env][varName];
        if (defaultValue) {
          console.log(`ℹ️  Using default for ${varName}: ${defaultValue}`);
        } else {
          console.warn(`⚠️  WARNING: ${varName} is not set (required for production)`);
          hasWarnings = true;
        }
      }
    } else {
      console.log(`✅ ${varName} is configured`);
    }
  }
  
  // Check recommended variables
  for (const varName of RECOMMENDED_VARS) {
    if (!process.env[varName]) {
      const defaultValue = DEFAULTS[env][varName];
      if (defaultValue) {
        console.log(`ℹ️  Using default for ${varName}: ${defaultValue}`);
      } else {
        console.warn(`⚠️  WARNING: Recommended variable ${varName} is not set`);
        hasWarnings = true;
      }
    }
  }
  
  // Validate Ollama URL format
  const ollamaUrl = process.env.REACT_APP_OLLAMA_URL || DEFAULTS[env].REACT_APP_OLLAMA_URL;
  if (ollamaUrl) {
    try {
      new URL(ollamaUrl);
      console.log(`✅ OLLAMA_URL format is valid: ${ollamaUrl}`);
      
      // Check for common issues
      if (isProduction && ollamaUrl.includes('localhost')) {
        console.error(`❌ ERROR: Production build cannot use localhost URL: ${ollamaUrl}`);
        console.error(`   Please set REACT_APP_OLLAMA_URL to your public Ollama endpoint`);
        hasErrors = true;
      }
      
      if (isProduction && ollamaUrl.startsWith('http://')) {
        console.warn(`⚠️  WARNING: Using HTTP in production is not recommended`);
        console.warn(`   Consider using HTTPS for security: ${ollamaUrl}`);
        hasWarnings = true;
      }
    } catch (error) {
      console.error(`❌ ERROR: Invalid OLLAMA_URL format: ${ollamaUrl}`);
      hasErrors = true;
    }
  }
  
  // Environment-specific checks
  if (isProduction) {
    console.log('\n📋 Production Environment Checklist:');
    console.log('   1. Ollama server is accessible from the internet');
    console.log('   2. CORS is properly configured on Ollama server');
    console.log('   3. Firewall allows connections to Ollama port');
    console.log('   4. SSL certificate is valid (if using HTTPS)');
  }
  
  // Summary
  console.log('\n📊 Environment Check Summary:');
  if (hasErrors) {
    console.error('❌ Environment check failed - please fix the errors above');
    process.exit(1);
  } else if (hasWarnings) {
    console.warn('⚠️  Environment check passed with warnings');
  } else {
    console.log('✅ Environment check passed');
  }
}

// Run the check
if (require.main === module) {
  checkEnvironmentVariables();
}

module.exports = { checkEnvironmentVariables };