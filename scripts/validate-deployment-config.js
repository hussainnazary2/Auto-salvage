#!/usr/bin/env node

/**
 * Deployment Configuration Validation Script
 * Validates that all deployment configuration is properly set up
 */

const fs = require('fs');
const path = require('path');

function validateFile(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    console.log(`❌ Missing ${description}: ${filePath}`);
    return false;
  }
}

function validatePackageJsonScripts() {
  console.log('\n📦 Validating package.json scripts...');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredScripts = [
    'build:production',
    'build:vercel',
    'env:check',
    'test:deployment',
    'deploy:preview',
    'deploy:production'
  ];
  
  let allPresent = true;
  
  for (const script of requiredScripts) {
    if (packageJson.scripts[script]) {
      console.log(`✅ Script: ${script}`);
    } else {
      console.log(`❌ Missing script: ${script}`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

function validateVercelConfig() {
  console.log('\n⚡ Validating Vercel configuration...');
  
  const vercelPath = path.join(process.cwd(), 'vercel.json');
  if (!fs.existsSync(vercelPath)) {
    console.log('❌ vercel.json not found');
    return false;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    
    if (config.builds && config.routes) {
      console.log('✅ vercel.json has required builds and routes');
      return true;
    } else {
      console.log('❌ vercel.json missing builds or routes');
      return false;
    }
  } catch (error) {
    console.log(`❌ Invalid vercel.json: ${error.message}`);
    return false;
  }
}

function validateEnvironmentFiles() {
  console.log('\n🔧 Validating environment files...');
  
  let allValid = true;
  
  // Check .env.example
  allValid &= validateFile('.env.example', 'Environment example file');
  
  // Check .env.production
  allValid &= validateFile('.env.production', 'Production environment file');
  
  return allValid;
}

function validateDocumentation() {
  console.log('\n📚 Validating documentation...');
  
  let allValid = true;
  
  allValid &= validateFile('docs/VERCEL_DEPLOYMENT.md', 'Vercel deployment guide');
  allValid &= validateFile('docs/VERCEL_QUICK_START.md', 'Quick start guide');
  allValid &= validateFile('docs/PLATFORM_REQUIREMENTS.md', 'Platform requirements');
  
  return allValid;
}

function validateScripts() {
  console.log('\n🔨 Validating deployment scripts...');
  
  let allValid = true;
  
  allValid &= validateFile('scripts/check-env.js', 'Environment check script');
  allValid &= validateFile('scripts/deploy.js', 'Deployment script');
  allValid &= validateFile('scripts/test-deployment.js', 'Deployment test script');
  
  return allValid;
}

function validateDependencies() {
  console.log('\n📋 Validating dependencies...');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check for cross-env (needed for Windows compatibility)
  if (packageJson.devDependencies && packageJson.devDependencies['cross-env']) {
    console.log('✅ cross-env dependency present (Windows compatibility)');
    return true;
  } else {
    console.log('❌ Missing cross-env dependency (needed for Windows)');
    return false;
  }
}

function main() {
  console.log('🔍 Validating Deployment Configuration...\n');
  
  let allValid = true;
  
  allValid &= validatePackageJsonScripts();
  allValid &= validateVercelConfig();
  allValid &= validateEnvironmentFiles();
  allValid &= validateDocumentation();
  allValid &= validateScripts();
  allValid &= validateDependencies();
  
  console.log('\n' + '='.repeat(50));
  
  if (allValid) {
    console.log('🎉 All deployment configuration is valid!');
    console.log('\nNext steps:');
    console.log('1. Install Vercel CLI: npm install -g vercel');
    console.log('2. Test deployment: npm run test:deployment');
    console.log('3. Deploy to preview: npm run deploy:preview');
    console.log('4. Deploy to production: npm run deploy:production');
    process.exit(0);
  } else {
    console.log('❌ Deployment configuration has issues.');
    console.log('Please fix the issues above before deploying.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateFile, validatePackageJsonScripts, validateVercelConfig };