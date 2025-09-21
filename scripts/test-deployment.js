#!/usr/bin/env node

/**
 * Deployment Testing Script
 * Tests the deployment process and validates platform-specific requirements
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class DeploymentTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };
    console.log(`${icons[type]} ${message}`);
  }

  addResult(test, passed, message, type = 'error') {
    this.results.tests.push({ test, passed, message, type });
    if (passed) {
      this.results.passed++;
    } else {
      if (type === 'warning') {
        this.results.warnings++;
      } else {
        this.results.failed++;
      }
    }
  }

  async testNodeVersion() {
    this.log('Testing Node.js version...');
    try {
      const version = process.version;
      const majorVersion = parseInt(version.slice(1).split('.')[0]);
      
      if (majorVersion >= 18) {
        this.addResult('Node.js Version', true, `Node.js ${version} is supported`);
        this.log(`Node.js ${version} is supported`, 'success');
      } else {
        this.addResult('Node.js Version', false, `Node.js ${version} is too old. Vercel requires Node.js 18+`);
        this.log(`Node.js ${version} is too old. Vercel requires Node.js 18+`, 'error');
      }
    } catch (error) {
      this.addResult('Node.js Version', false, `Failed to check Node.js version: ${error.message}`);
    }
  }

  async testVercelCLI() {
    this.log('Testing Vercel CLI...');
    try {
      const version = execSync('vercel --version', { encoding: 'utf8' }).trim();
      this.addResult('Vercel CLI', true, `Vercel CLI ${version} is installed`);
      this.log(`Vercel CLI ${version} is installed`, 'success');
    } catch (error) {
      this.addResult('Vercel CLI', false, 'Vercel CLI is not installed. Run: npm i -g vercel');
      this.log('Vercel CLI is not installed. Run: npm i -g vercel', 'error');
    }
  }

  async testPackageJson() {
    this.log('Testing package.json configuration...');
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check required scripts
      const requiredScripts = ['build', 'build:production', 'env:check'];
      const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
      
      if (missingScripts.length === 0) {
        this.addResult('Package Scripts', true, 'All required build scripts are present');
        this.log('All required build scripts are present', 'success');
      } else {
        this.addResult('Package Scripts', false, `Missing scripts: ${missingScripts.join(', ')}`);
        this.log(`Missing scripts: ${missingScripts.join(', ')}`, 'error');
      }
      
      // Check dependencies
      const requiredDeps = ['react', 'react-dom', 'react-scripts'];
      const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
      
      if (missingDeps.length === 0) {
        this.addResult('Dependencies', true, 'All required dependencies are present');
        this.log('All required dependencies are present', 'success');
      } else {
        this.addResult('Dependencies', false, `Missing dependencies: ${missingDeps.join(', ')}`);
        this.log(`Missing dependencies: ${missingDeps.join(', ')}`, 'error');
      }
      
    } catch (error) {
      this.addResult('Package.json', false, `Failed to read package.json: ${error.message}`);
    }
  }

  async testVercelConfig() {
    this.log('Testing Vercel configuration...');
    try {
      const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
      
      if (fs.existsSync(vercelConfigPath)) {
        const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
        
        // Validate configuration structure
        if (config.builds && config.routes) {
          this.addResult('Vercel Config', true, 'vercel.json is properly configured');
          this.log('vercel.json is properly configured', 'success');
        } else {
          this.addResult('Vercel Config', false, 'vercel.json is missing required builds or routes configuration');
          this.log('vercel.json is missing required builds or routes configuration', 'error');
        }
      } else {
        this.addResult('Vercel Config', false, 'vercel.json not found');
        this.log('vercel.json not found', 'error');
      }
    } catch (error) {
      this.addResult('Vercel Config', false, `Failed to validate vercel.json: ${error.message}`);
    }
  }

  async testEnvironmentFiles() {
    this.log('Testing environment configuration...');
    
    const envFiles = ['.env.example', '.env.production'];
    
    for (const envFile of envFiles) {
      const envPath = path.join(process.cwd(), envFile);
      if (fs.existsSync(envPath)) {
        this.addResult(`Environment File (${envFile})`, true, `${envFile} exists`);
        this.log(`${envFile} exists`, 'success');
        
        // Check for required variables in .env.example
        if (envFile === '.env.example') {
          const content = fs.readFileSync(envPath, 'utf8');
          const requiredVars = ['REACT_APP_OLLAMA_URL', 'REACT_APP_OLLAMA_MODEL'];
          const missingVars = requiredVars.filter(varName => !content.includes(varName));
          
          if (missingVars.length === 0) {
            this.addResult('Environment Variables', true, 'All required environment variables are documented');
            this.log('All required environment variables are documented', 'success');
          } else {
            this.addResult('Environment Variables', false, `Missing environment variables: ${missingVars.join(', ')}`);
            this.log(`Missing environment variables in .env.example: ${missingVars.join(', ')}`, 'error');
          }
        }
      } else {
        this.addResult(`Environment File (${envFile})`, false, `${envFile} not found`);
        this.log(`${envFile} not found`, 'error');
      }
    }
  }

  async testBuildProcess() {
    this.log('Testing build process...');
    try {
      // Set test environment variables
      process.env.REACT_APP_OLLAMA_URL = 'https://test.example.com';
      process.env.REACT_APP_OLLAMA_MODEL = 'test-model';
      process.env.NODE_ENV = 'production';
      
      this.log('Running production build...');
      execSync('npm run build:production', { 
        stdio: 'pipe',
        timeout: 120000 // 2 minutes timeout
      });
      
      // Check if build directory exists
      const buildDir = path.join(process.cwd(), 'build');
      if (fs.existsSync(buildDir)) {
        const indexPath = path.join(buildDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          this.addResult('Build Process', true, 'Production build completed successfully');
          this.log('Production build completed successfully', 'success');
          
          // Check build size
          const stats = fs.statSync(indexPath);
          if (stats.size > 0) {
            this.addResult('Build Output', true, `Build output is valid (index.html: ${stats.size} bytes)`);
            this.log(`Build output is valid (index.html: ${stats.size} bytes)`, 'success');
          } else {
            this.addResult('Build Output', false, 'Build output appears to be empty');
            this.log('Build output appears to be empty', 'error');
          }
        } else {
          this.addResult('Build Output', false, 'index.html not found in build directory');
          this.log('index.html not found in build directory', 'error');
        }
      } else {
        this.addResult('Build Process', false, 'Build directory not created');
        this.log('Build directory not created', 'error');
      }
    } catch (error) {
      this.addResult('Build Process', false, `Build failed: ${error.message}`);
      this.log(`Build failed: ${error.message}`, 'error');
    }
  }

  async testEnvironmentValidation() {
    this.log('Testing environment validation script...');
    try {
      // Test with missing required variables
      delete process.env.REACT_APP_OLLAMA_URL;
      process.env.NODE_ENV = 'production';
      
      try {
        execSync('npm run env:check', { stdio: 'pipe' });
        this.addResult('Environment Validation', false, 'Environment validation should fail with missing variables');
        this.log('Environment validation should fail with missing variables', 'error');
      } catch (error) {
        // This is expected - validation should fail
        this.addResult('Environment Validation', true, 'Environment validation correctly fails with missing variables');
        this.log('Environment validation correctly fails with missing variables', 'success');
      }
      
      // Test with valid variables
      process.env.REACT_APP_OLLAMA_URL = 'https://test.example.com';
      process.env.REACT_APP_OLLAMA_MODEL = 'test-model';
      
      execSync('npm run env:check', { stdio: 'pipe' });
      this.addResult('Environment Validation (Valid)', true, 'Environment validation passes with valid variables');
      this.log('Environment validation passes with valid variables', 'success');
      
    } catch (error) {
      this.addResult('Environment Validation', false, `Environment validation script failed: ${error.message}`);
      this.log(`Environment validation script failed: ${error.message}`, 'error');
    }
  }

  async testPlatformSpecificRequirements() {
    this.log('Testing platform-specific requirements...');
    
    // Test Windows-specific requirements
    if (process.platform === 'win32') {
      this.log('Detected Windows platform');
      
      // Check PowerShell availability
      try {
        execSync('powershell -Command "Get-Host"', { stdio: 'pipe' });
        this.addResult('PowerShell', true, 'PowerShell is available');
        this.log('PowerShell is available', 'success');
      } catch (error) {
        this.addResult('PowerShell', false, 'PowerShell is not available', 'warning');
        this.log('PowerShell is not available (some scripts may not work)', 'warning');
      }
    }
    
    // Test Git availability (required for Vercel)
    try {
      const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
      this.addResult('Git', true, `Git is available: ${gitVersion}`);
      this.log(`Git is available: ${gitVersion}`, 'success');
    } catch (error) {
      this.addResult('Git', false, 'Git is not installed (required for Vercel deployment)');
      this.log('Git is not installed (required for Vercel deployment)', 'error');
    }
    
    // Test npm/yarn
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      this.addResult('NPM', true, `NPM is available: ${npmVersion}`);
      this.log(`NPM is available: ${npmVersion}`, 'success');
    } catch (error) {
      this.addResult('NPM', false, 'NPM is not available');
      this.log('NPM is not available', 'error');
    }
  }

  async testDocumentation() {
    this.log('Testing documentation completeness...');
    
    const requiredDocs = [
      'docs/VERCEL_DEPLOYMENT.md',
      'docs/VERCEL_QUICK_START.md',
      'README.md'
    ];
    
    for (const docPath of requiredDocs) {
      const fullPath = path.join(process.cwd(), docPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.length > 100) { // Basic content check
          this.addResult(`Documentation (${docPath})`, true, `${docPath} exists and has content`);
          this.log(`${docPath} exists and has content`, 'success');
        } else {
          this.addResult(`Documentation (${docPath})`, false, `${docPath} exists but appears incomplete`);
          this.log(`${docPath} exists but appears incomplete`, 'warning');
        }
      } else {
        this.addResult(`Documentation (${docPath})`, false, `${docPath} not found`);
        this.log(`${docPath} not found`, 'error');
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DEPLOYMENT TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`📋 Total Tests: ${this.results.tests.length}`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => !test.passed && test.type !== 'warning')
        .forEach(test => console.log(`   • ${test.test}: ${test.message}`));
    }
    
    if (this.results.warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.tests
        .filter(test => !test.passed && test.type === 'warning')
        .forEach(test => console.log(`   • ${test.test}: ${test.message}`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.results.failed === 0) {
      console.log('🎉 All critical tests passed! Ready for deployment.');
      return true;
    } else {
      console.log('❌ Some tests failed. Please fix the issues before deploying.');
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Deployment Tests...\n');
    
    await this.testNodeVersion();
    await this.testVercelCLI();
    await this.testPackageJson();
    await this.testVercelConfig();
    await this.testEnvironmentFiles();
    await this.testEnvironmentValidation();
    await this.testBuildProcess();
    await this.testPlatformSpecificRequirements();
    await this.testDocumentation();
    
    return this.printSummary();
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DeploymentTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { DeploymentTester };