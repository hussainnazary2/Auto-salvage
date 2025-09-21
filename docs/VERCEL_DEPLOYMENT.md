# Vercel Deployment Guide

This guide walks you through deploying the damaged car business chatbot to Vercel, with the chatbot connecting to your local PC's Ollama installation.

## Overview

The deployment architecture:
- **Frontend**: React app deployed on Vercel
- **AI Backend**: Ollama running on your local PC
- **Connection**: Vercel app connects to your PC via internet

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm i -g vercel`
3. **Ollama Setup**: Ollama running on your PC with a model loaded
4. **Internet Access**: Your PC must be accessible from the internet

## Step 1: Prepare Your Local Ollama

### 1.1 Configure Ollama for Remote Access

Choose one of these methods to expose your Ollama to the internet:

#### Option A: ngrok (Recommended for testing)
```bash
# Install ngrok from https://ngrok.com
# Run Ollama normally on your PC
ollama serve

# In another terminal, expose Ollama
ngrok http 11434

# Note the HTTPS URL (e.g., https://abc123.ngrok.io)
```

#### Option B: Cloudflare Tunnel (Recommended for production)
```bash
# Install cloudflared
# Create tunnel
cloudflared tunnel create ollama-tunnel

# Configure tunnel (create config.yml)
tunnel: your-tunnel-id
credentials-file: /path/to/credentials.json
ingress:
  - hostname: ollama.yourdomain.com
    service: http://localhost:11434
  - service: http_status:404

# Run tunnel
cloudflared tunnel run ollama-tunnel
```

#### Option C: Direct IP + Port Forwarding
```bash
# Configure your router to forward port 11434 to your PC
# Set up dynamic DNS if your IP changes
# Configure Ollama to accept external connections
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

### 1.2 Configure CORS on Ollama

Set the allowed origins for your Vercel app:

```bash
# Replace with your actual Vercel app URL
export OLLAMA_ORIGINS="https://your-app.vercel.app,https://*.vercel.app"

# Or add to your system environment variables permanently
```

### 1.3 Test Ollama Accessibility

```bash
# Test from another machine or online tool
curl https://your-ollama-url/api/tags

# Should return list of available models
```

## Step 2: Configure Environment Variables

### 2.1 Create Local Environment File

Copy and customize the production environment:

```bash
cp .env.production .env.local
```

Edit `.env.local` with your Ollama URL:

```env
# Your Ollama endpoint (from Step 1)
REACT_APP_OLLAMA_URL=https://your-ollama-url

# Your model name
REACT_APP_OLLAMA_MODEL=mistral-nz-cars

# Production settings
REACT_APP_CORS_MODE=cors
REACT_APP_OLLAMA_TIMEOUT=45000
```

### 2.2 Test Locally

```bash
# Test the configuration locally
npm start

# Verify chatbot connects to your remote Ollama
```

## Step 3: Deploy to Vercel

### 3.1 Initial Setup

```bash
# Login to Vercel
vercel login

# Link your project (run in project root)
vercel

# Follow prompts to create new project
```

### 3.2 Configure Vercel Environment Variables

In the Vercel dashboard or via CLI:

```bash
# Set environment variables
vercel env add REACT_APP_OLLAMA_URL
# Enter your Ollama URL when prompted

vercel env add REACT_APP_OLLAMA_MODEL
# Enter your model name

vercel env add REACT_APP_CORS_MODE
# Enter: cors

vercel env add REACT_APP_OLLAMA_TIMEOUT
# Enter: 45000
```

Or use the Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the required variables for Production environment

### 3.3 Deploy

```bash
# Deploy to preview (for testing)
npm run deploy:preview

# Deploy to production
npm run deploy:production
```

## Step 4: Verify Deployment

### 4.1 Test Chatbot Functionality

1. **Open your Vercel app URL**
2. **Test chatbot connection**:
   - Should show "Connected" status
   - Send a test message
   - Verify AI responses work

3. **Test error scenarios**:
   - Stop Ollama on your PC
   - Verify error messages appear
   - Restart Ollama and verify reconnection

### 4.2 Performance Testing

1. **Response times**: Should be reasonable (2-10 seconds)
2. **Connection stability**: Test multiple messages
3. **Mobile compatibility**: Test on mobile devices

## Step 5: Ongoing Maintenance

### 5.1 Keeping Ollama Running

Your PC must stay online for the chatbot to work:

```bash
# Keep Ollama running as a service (Linux/Mac)
sudo systemctl enable ollama
sudo systemctl start ollama

# Windows: Use Task Scheduler or run as Windows Service
```

### 5.2 Monitoring

- **Vercel Analytics**: Monitor app performance
- **Ollama Logs**: Check for connection issues
- **Error Tracking**: Monitor chatbot error rates

### 5.3 Updates

```bash
# Update and redeploy
git add .
git commit -m "Update chatbot"
git push

# Vercel auto-deploys from git (if configured)
# Or manually deploy:
npm run deploy:production
```

## Troubleshooting

### Common Issues

#### 1. CORS Errors
```
Error: CORS policy blocks request
```

**Solution**:
- Verify `OLLAMA_ORIGINS` is set correctly on your PC
- Check Vercel app URL matches the origin
- Ensure using HTTPS for production

#### 2. Connection Timeout
```
Error: Request timeout after 45000ms
```

**Solutions**:
- Check your PC is online and accessible
- Verify firewall allows connections
- Test Ollama URL directly in browser
- Increase timeout in environment variables

#### 3. Model Not Found
```
Error: Model 'mistral-nz-cars' not found
```

**Solutions**:
- Verify model is pulled: `ollama list`
- Pull model: `ollama pull mistral-nz-cars`
- Check model name in environment variables

#### 4. Vercel Build Fails
```
Error: Environment variable validation failed
```

**Solutions**:
- Run `npm run env:check` locally
- Verify all required environment variables are set
- Check Vercel environment variable configuration

### Getting Help

1. **Check logs**:
   ```bash
   # Vercel function logs
   vercel logs
   
   # Local Ollama logs
   ollama logs
   ```

2. **Test connectivity**:
   ```bash
   # Test Ollama endpoint
   curl https://your-ollama-url/api/tags
   
   # Test from Vercel
   # Use Vercel's edge functions to test connectivity
   ```

3. **Debug mode**:
   ```bash
   # Enable debug logging
   vercel env add DEBUG
   # Set to: ollama,chatbot,cors
   ```

## Security Considerations

### 1. Network Security

- **Use HTTPS**: Always use HTTPS for production
- **Firewall Rules**: Only allow necessary ports
- **VPN Option**: Consider VPN for extra security

### 2. Access Control

- **Origin Validation**: Properly configure OLLAMA_ORIGINS
- **Rate Limiting**: Consider implementing rate limiting
- **Monitoring**: Monitor for unusual traffic patterns

### 3. Data Privacy

- **Local Processing**: All AI processing stays on your PC
- **No External APIs**: No data sent to third-party AI services
- **Session Management**: Conversations cleared on page refresh

## Advanced Configuration

### Custom Domain

1. **Add domain in Vercel**:
   - Go to project settings → Domains
   - Add your custom domain
   - Configure DNS records

2. **Update CORS configuration**:
   ```bash
   export OLLAMA_ORIGINS="https://yourdomain.com"
   ```

### Load Balancing

For high availability, consider multiple Ollama instances:

```env
# Primary Ollama
REACT_APP_OLLAMA_URL=https://ollama1.yourdomain.com

# Fallback URLs (implement in OllamaService)
REACT_APP_OLLAMA_FALLBACK_URLS=https://ollama2.yourdomain.com,https://ollama3.yourdomain.com
```

### Monitoring and Analytics

```env
# Enable detailed logging
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_LOG_LEVEL=info

# Performance monitoring
REACT_APP_PERFORMANCE_MONITORING=true
```

## Cost Considerations

### Vercel Costs
- **Hobby Plan**: Free for personal projects
- **Pro Plan**: $20/month for commercial use
- **Bandwidth**: Monitor usage for large deployments

### Infrastructure Costs
- **PC Power**: Keep PC running 24/7
- **Internet**: Stable broadband connection required
- **Domain**: Optional custom domain costs

## Conclusion

This setup provides a powerful, privacy-focused chatbot solution where:
- Frontend scales with Vercel's global CDN
- AI processing stays on your hardware
- Full control over data and models
- Cost-effective for small to medium businesses

For production use, consider implementing monitoring, backup strategies, and high availability configurations based on your specific needs.