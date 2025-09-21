# Damaged Car Buying Business Website

A React application for a damaged car buying business in New Zealand with the following features:

1. Public Homepage with:
   - Hero section with headline and subheadline
   - Car submission form
   - How It Works section
   - Why Choose Us section
   - About Us section

2. Admin Login Page:
   - Simple login form (accepts any credentials for demo)
   - Redirects to dashboard upon login

3. Admin Dashboard:
   - Table of dummy leads
   - Charts showing traffic sources and leads per week
   - Logout functionality

4. AI Chatbot:
   - Floating chat button accessible from all pages
   - Powered by Ollama for local AI assistance
   - Helps users with car selling questions

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- Ollama (for chatbot functionality)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd damaged-car-business
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Set up environment variables:
   ```
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Ollama configuration.

## Deployment

### Vercel Deployment

This application is configured for easy deployment to Vercel with Ollama running on your local PC.

#### Quick Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Test deployment readiness
npm run test:deployment

# Deploy to preview
npm run deploy:preview

# Deploy to production
npm run deploy:production
```

#### Detailed Setup
See our comprehensive deployment guides:
- [Vercel Deployment Guide](./docs/VERCEL_DEPLOYMENT.md) - Complete setup instructions
- [Quick Start Guide](./docs/VERCEL_QUICK_START.md) - 5-minute deployment
- [Platform Requirements](./docs/PLATFORM_REQUIREMENTS.md) - OS-specific requirements

#### Environment Variables for Production
Set these in your Vercel dashboard:
- `REACT_APP_OLLAMA_URL` - Your Ollama endpoint URL
- `REACT_APP_OLLAMA_MODEL` - Your model name (e.g., mistral-nz-cars)
- `REACT_APP_CORS_MODE=cors`
- `REACT_APP_OLLAMA_TIMEOUT=45000`

### Setting up Ollama for Chatbot

1. Download and install Ollama from [https://ollama.com/](https://ollama.com/)
2. Pull a model (e.g., llama3):
   ```
   ollama pull llama3
   ```
3. Start Ollama service (it should start automatically after installation)

### Running Locally

To start the development server:
```
npm start
```

The application will be available at http://localhost:3000

To start Ollama (if not already running):
```
ollama serve
```

### Building for Production

To create a production build:
```
npm run build
```

### Deployment

This application is ready to deploy to Vercel:

1. Push your code to a GitHub repository
2. Sign up/log in to Vercel
3. Click "New Project"
4. Import your GitHub repository
5. Configure the project:
   - Framework Preset: React
   - Build Command: `npm run build`
   - Output Directory: `build`
6. Click "Deploy"

## Technologies Used

- React
- React Router
- Recharts (for data visualization)
- CSS3 (for styling)

## Project Structure

```
src/
├── assets/          # Image assets
├── components/      # Reusable components
├── pages/           # Page components
└── App.js          # Main app component with routing
```

## Features

- Responsive design that works on mobile, tablet, and desktop
- Professional color scheme (blue for trust, orange for call-to-action)
- Form validation
- Local storage for session management
- Interactive charts in the admin dashboard
- AI-powered chatbot using Ollama

## Chatbot Usage

The chatbot can be accessed by clicking the chat icon (💬) in the bottom right corner of any page. It connects to your locally running Ollama service to provide AI assistance.

For the chatbot to work:
1. Make sure Ollama is installed and running
2. Ensure a model is available (default is llama3)
3. The web browser must be able to make requests to http://localhost:11434

### Remote Ollama Access

For production deployments where your app is hosted on Vercel but Ollama runs on your local PC, see our comprehensive documentation:

- **🚀 [Quick Setup Guide](./docs/QUICK_SETUP_REFERENCE.md)** - Fast setup for development and testing
- **📖 [Complete Setup Guide](./docs/OLLAMA_REMOTE_SETUP.md)** - Detailed instructions for all connection methods
- **🔒 [Security Checklist](./docs/SECURITY_CHECKLIST.md)** - Essential security practices
- **🔧 [Troubleshooting Guide](./docs/TROUBLESHOOTING_GUIDE.md)** - Diagnose and fix common issues

The documentation covers four connection methods:
1. **ngrok Tunnel** (recommended for development)
2. **Cloudflare Tunnel** (recommended for production)
3. **Custom Domain + DDNS** (for professional setups)
4. **Direct IP + Port Forwarding** (testing only)

### Environment Configuration

Create a `.env.local` file for local development:
```bash
REACT_APP_OLLAMA_URL=http://localhost:11434
REACT_APP_OLLAMA_MODEL=mistral
```

For production deployment, set these environment variables in your hosting platform:
```bash
REACT_APP_OLLAMA_URL=https://your-tunnel-url
REACT_APP_OLLAMA_MODEL=mistral
```