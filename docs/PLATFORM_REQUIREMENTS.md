# Platform-Specific Requirements for Vercel Deployment

## Overview

This document outlines platform-specific requirements and considerations for deploying the damaged car business chatbot to Vercel across different operating systems and environments.

## General Requirements

### Node.js Version
- **Minimum**: Node.js 18.x
- **Recommended**: Node.js 20.x LTS
- **Vercel Support**: Node.js 18.x, 20.x
- **Check**: `node --version`

### Package Manager
- **NPM**: 8.x or higher (comes with Node.js 18+)
- **Yarn**: 1.22.x or higher (optional)
- **PNPM**: 7.x or higher (optional)

### Git
- **Required**: Git 2.x or higher
- **Purpose**: Version control and Vercel deployment
- **Check**: `git --version`

## Platform-Specific Requirements

### Windows

#### Prerequisites
```powershell
# Check PowerShell version (should be 5.1+)
$PSVersionTable.PSVersion

# Check Windows version (Windows 10/11 recommended)
Get-ComputerInfo | Select WindowsProductName, WindowsVersion
```

#### Required Software
1. **Node.js**: Download from [nodejs.org](https://nodejs.org)
2. **Git**: Download from [git-scm.com](https://git-scm.com)
3. **Vercel CLI**: `npm install -g vercel`

#### Windows-Specific Considerations
- **Path Length**: Ensure long path support is enabled for deep node_modules
- **Execution Policy**: May need to set PowerShell execution policy:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- **Antivirus**: Exclude node_modules from real-time scanning for better performance
- **WSL**: Windows Subsystem for Linux can be used as alternative environment

#### Testing on Windows
```cmd
# Test deployment readiness
npm run test:deployment

# Test build process
npm run build:production

# Test environment validation
npm run env:check
```

### macOS

#### Prerequisites
```bash
# Check macOS version (10.15+ recommended)
sw_vers

# Check Xcode Command Line Tools
xcode-select --version
```

#### Required Software
1. **Node.js**: Install via [nodejs.org](https://nodejs.org) or Homebrew
   ```bash
   brew install node
   ```
2. **Git**: Usually pre-installed, or via Homebrew
   ```bash
   brew install git
   ```
3. **Vercel CLI**: 
   ```bash
   npm install -g vercel
   ```

#### macOS-Specific Considerations
- **Rosetta 2**: Required for Apple Silicon Macs running x86 Node.js
- **Permissions**: May need to use `sudo` for global npm installs
- **Homebrew**: Recommended package manager for dependencies

### Linux (Ubuntu/Debian)

#### Prerequisites
```bash
# Check Linux distribution
lsb_release -a

# Check available packages
apt list --installed | grep -E "(nodejs|npm|git)"
```

#### Installation
```bash
# Update package list
sudo apt update

# Install Node.js (via NodeSource repository for latest version)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install -y git

# Install Vercel CLI
npm install -g vercel
```

#### Linux-Specific Considerations
- **Permissions**: Avoid using `sudo` with npm when possible
- **Node Version Manager**: Consider using `nvm` for Node.js version management
- **Build Tools**: May need build-essential for native modules
  ```bash
  sudo apt-get install -y build-essential
  ```

### Linux (CentOS/RHEL/Fedora)

#### Installation
```bash
# For CentOS/RHEL
sudo yum install -y nodejs npm git

# For Fedora
sudo dnf install -y nodejs npm git

# Or use NodeSource repository for latest versions
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

## Vercel-Specific Requirements

### Account Setup
1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Integration**: Connect GitHub account for automatic deployments
3. **Domain**: Optional custom domain configuration

### CLI Authentication
```bash
# Login to Vercel
vercel login

# Verify authentication
vercel whoami
```

### Project Configuration
- **vercel.json**: Platform-agnostic configuration file
- **Environment Variables**: Set via Vercel dashboard or CLI
- **Build Settings**: Configured in vercel.json or dashboard

## Environment Variables

### Required Variables
```env
REACT_APP_OLLAMA_URL=https://your-ollama-endpoint
REACT_APP_OLLAMA_MODEL=your-model-name
```

### Platform-Specific Environment Setup

#### Windows (Command Prompt)
```cmd
set REACT_APP_OLLAMA_URL=https://your-ollama-endpoint
set REACT_APP_OLLAMA_MODEL=your-model-name
npm run build:production
```

#### Windows (PowerShell)
```powershell
$env:REACT_APP_OLLAMA_URL="https://your-ollama-endpoint"
$env:REACT_APP_OLLAMA_MODEL="your-model-name"
npm run build:production
```

#### macOS/Linux (Bash/Zsh)
```bash
export REACT_APP_OLLAMA_URL="https://your-ollama-endpoint"
export REACT_APP_OLLAMA_MODEL="your-model-name"
npm run build:production
```

## Network Requirements

### Firewall Configuration
- **Outbound HTTPS (443)**: Required for Vercel deployment
- **Outbound HTTP (80)**: Required for some package downloads
- **Git Protocol**: Required for repository access

### Corporate Networks
- **Proxy Settings**: Configure npm proxy if behind corporate firewall
  ```bash
  npm config set proxy http://proxy.company.com:8080
  npm config set https-proxy http://proxy.company.com:8080
  ```
- **Certificate Issues**: May need to configure custom CA certificates

## Performance Considerations

### Build Performance
- **RAM**: Minimum 4GB, recommended 8GB+ for large projects
- **CPU**: Multi-core processor recommended for faster builds
- **Storage**: SSD recommended, minimum 10GB free space

### Network Performance
- **Bandwidth**: Stable internet connection for deployment
- **Latency**: Lower latency improves deployment speed
- **CDN**: Vercel's global CDN handles distribution

## Troubleshooting Platform Issues

### Windows Issues

#### Long Path Names
```cmd
# Enable long path support (Windows 10 1607+)
# Run as Administrator
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

#### PowerShell Execution Policy
```powershell
# If scripts won't run
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Node.js Permission Issues
```cmd
# Fix npm permissions on Windows
npm config set prefix %APPDATA%\npm
```

### macOS Issues

#### Permission Denied
```bash
# Fix npm permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

#### Apple Silicon Compatibility
```bash
# Install Rosetta 2 if needed
softwareupdate --install-rosetta
```

### Linux Issues

#### Permission Issues
```bash
# Fix npm global permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile
```

#### Missing Build Tools
```bash
# Ubuntu/Debian
sudo apt-get install -y build-essential python3

# CentOS/RHEL
sudo yum groupinstall -y "Development Tools"
sudo yum install -y python3
```

## Testing Platform Compatibility

### Automated Testing
```bash
# Run platform compatibility tests
npm run test:deployment

# Test build process
npm run build:production

# Validate environment
npm run env:check
```

### Manual Testing Checklist

#### Pre-Deployment
- [ ] Node.js version is 18+ (`node --version`)
- [ ] NPM is working (`npm --version`)
- [ ] Git is installed (`git --version`)
- [ ] Vercel CLI is installed (`vercel --version`)
- [ ] Can authenticate with Vercel (`vercel whoami`)

#### Build Testing
- [ ] Environment variables are set
- [ ] Build completes without errors (`npm run build:production`)
- [ ] Build output exists in `build/` directory
- [ ] Environment validation passes (`npm run env:check`)

#### Deployment Testing
- [ ] Can deploy to preview (`npm run deploy:preview`)
- [ ] Preview deployment works correctly
- [ ] Can deploy to production (`npm run deploy:production`)
- [ ] Production deployment works correctly

## CI/CD Considerations

### GitHub Actions (Cross-Platform)
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:deployment
      - run: npm run build:production
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Platform-Specific CI
- **Windows**: Use `runs-on: windows-latest`
- **macOS**: Use `runs-on: macos-latest`
- **Linux**: Use `runs-on: ubuntu-latest` (default)

## Security Considerations

### Platform Security
- **Windows**: Keep Windows Defender updated
- **macOS**: Enable Gatekeeper and System Integrity Protection
- **Linux**: Keep system packages updated

### Development Security
- **Dependencies**: Regularly audit with `npm audit`
- **Environment Variables**: Never commit secrets to version control
- **HTTPS**: Always use HTTPS for production deployments

## Support and Resources

### Official Documentation
- [Vercel Documentation](https://vercel.com/docs)
- [Node.js Documentation](https://nodejs.org/docs)
- [React Documentation](https://react.dev)

### Platform-Specific Help
- **Windows**: [Node.js on Windows](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- **macOS**: [Node.js on macOS](https://nodejs.org/en/download/package-manager/#macos)
- **Linux**: [Node.js on Linux](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions)

### Community Support
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Node.js Community](https://nodejs.org/en/get-involved/)
- [React Community](https://react.dev/community)