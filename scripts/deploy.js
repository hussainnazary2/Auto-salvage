#!/usr/bin/env node

/**
 * Deployment Script for Vercel
 * Handles different deployment environments and configurations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEPLOYMENT_CONFIGS = {
  preview: {
    command: 'vercel',
    description: 'Deploy to preview environment'
  },
  production: {
    command: 'vercel --prod',
    description: 'Deploy to production environment'
  }
};

function runCommand(command, description) {
  console.log(`\n🚀 ${description}...`);
  console.log(`Running: ${command}`);
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    return false;
  }
}

function checkVercelCLI() {
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error('❌ Vercel CLI is not installed');
    console.error('   Install it with: npm i -g vercel');
    return false;
  }
}

function validateBuild() {
  const buildDir = path.join(process.cwd(), 'build');
  if (!fs.existsSync(buildDir)) {
    console.error('❌ Build directory not found');
    console.error('   Run "npm run build" first');
    return false;
  }
  
  const indexFile = path.join(buildDir, 'index.html');
  if (!fs.existsSync(indexFile)) {
    console.error('❌ Build appears incomplete - index.html not found');
    return false;
  }
  
  console.log('✅ Build validation passed');
  return true;
}

function deploy(environment = 'preview') {
  console.log(`🔧 Starting deployment to ${environment}...`);
  
  // Check prerequisites
  if (!checkVercelCLI()) {
    process.exit(1);
  }
  
  // Run environment check
  console.log('\n🔍 Checking environment variables...');
  if (!runCommand('npm run env:check', 'Environment validation')) {
    process.exit(1);
  }
  
  // Build the project
  console.log('\n🏗️  Building project...');
  if (!runCommand('npm run build:production', 'Production build')) {
    process.exit(1);
  }
  
  // Validate build
  if (!validateBuild()) {
    process.exit(1);
  }
  
  // Deploy
  const config = DEPLOYMENT_CONFIGS[environment];
  if (!config) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.error(`   Available environments: ${Object.keys(DEPLOYMENT_CONFIGS).join(', ')}`);
    process.exit(1);
  }
  
  if (!runCommand(config.command, config.description)) {
    process.exit(1);
  }
  
  console.log('\n🎉 Deployment completed successfully!');
  
  // Post-deployment instructions
  console.log('\n📋 Post-Deployment Checklist:');
  console.log('   1. Test the chatbot functionality');
  console.log('   2. Verify Ollama connection works');
  console.log('   3. Check error handling with Ollama offline');
  console.log('   4. Validate CORS configuration');
  console.log('   5. Test on different devices/browsers');
}

// Parse command line arguments
const args = process.argv.slice(2);
const environment = args[0] || 'preview';

if (require.main === module) {
  deploy(environment);
}

module.exports = { deploy };