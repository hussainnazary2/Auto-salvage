# Ollama Remote Access Setup Guide

This guide provides comprehensive instructions for exposing your local Ollama installation to the internet so your deployed React chatbot can access it remotely.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Connection Methods Overview](#connection-methods-overview)
3. [Method 1: Direct IP + Port Forwarding](#method-1-direct-ip--port-forwarding)
4. [Method 2: ngrok Tunnel](#method-2-ngrok-tunnel)
5. [Method 3: Cloudflare Tunnel](#method-3-cloudflare-tunnel)
6. [Method 4: Custom Domain + DDNS](#method-4-custom-domain--ddns)
7. [Security Guidelines](#security-guidelines)
8. [Environment Configuration](#environment-configuration)
9. [Troubleshooting](#troubleshooting)
10. [Testing Your Setup](#testing-your-setup)

## Prerequisites

Before setting up remote access, ensure you have:

- Ollama installed and running on your local machine
- A suitable AI model downloaded (e.g., `ollama pull mistral`)
- Basic understanding of networking concepts
- Administrative access to your router (for some methods)
- A domain name (for custom domain method)

### Verify Ollama is Working Locally

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Should return a JSON response with your installed models
```

## Connection Methods Overview

| Method | Difficulty | Security | Cost | Stability | Best For |
|--------|------------|----------|------|-----------|----------|
| Direct IP | Medium | Low | Free | Medium | Testing only |
| ngrok | Easy | Medium | Free/Paid | Medium | Development |
| Cloudflare Tunnel | Medium | High | Free | High | Production |
| Custom Domain | Hard | High | Domain cost | High | Professional use |

## Method 1: Direct IP + Port Forwarding

⚠️ **Warning**: This method exposes your Ollama directly to the internet. Use only for testing.

### Step 1: Configure Ollama for External Access

```bash
# Stop Ollama if running
pkill ollama

# Set environment variables (Linux/Mac)
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS="*"

# Start Ollama
ollama serve
```

For Windows:
```cmd
# Set environment variables
set OLLAMA_HOST=0.0.0.0:11434
set OLLAMA_ORIGINS=*

# Start Ollama
ollama serve
```

### Step 2: Configure Router Port Forwarding

1. Access your router's admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Navigate to Port Forwarding settings
3. Create a new rule:
   - **External Port**: 11434
   - **Internal IP**: Your PC's local IP (e.g., `192.168.1.100`)
   - **Internal Port**: 11434
   - **Protocol**: TCP

### Step 3: Find Your Public IP

```bash
# Get your public IP
curl ifconfig.me
```

### Step 4: Configure Your App

```bash
# Set environment variable for your deployed app
REACT_APP_OLLAMA_URL=http://YOUR_PUBLIC_IP:11434
```

### Security Considerations for Direct IP

- Your Ollama is exposed to the entire internet
- No encryption (HTTP only)
- Vulnerable to attacks
- IP address may change frequently

## Method 2: ngrok Tunnel

ngrok creates a secure tunnel to your local Ollama instance.

### Step 1: Install ngrok

```bash
# Download from https://ngrok.com/download
# Or using package managers:

# macOS
brew install ngrok/ngrok/ngrok

# Windows (Chocolatey)
choco install ngrok

# Linux (Snap)
snap install ngrok
```

### Step 2: Sign Up and Authenticate

```bash
# Sign up at https://ngrok.com and get your auth token
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Step 3: Configure Ollama

```bash
# Ensure Ollama accepts external connections
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS="*.ngrok.io,*.ngrok-free.app"
ollama serve
```

### Step 4: Start ngrok Tunnel

```bash
# In a new terminal, start the tunnel
ngrok http 11434

# You'll see output like:
# Forwarding    https://abc123.ngrok-free.app -> http://localhost:11434
```

### Step 5: Configure Your App

```bash
# Use the HTTPS URL from ngrok
REACT_APP_OLLAMA_URL=https://abc123.ngrok-free.app
```

### ngrok Pro Features

For production use, consider ngrok Pro:
- Custom domains
- Reserved URLs
- Higher connection limits
- No "Visit Site" warning page

## Method 3: Cloudflare Tunnel

Cloudflare Tunnel provides a secure, free way to expose your Ollama instance.

### Step 1: Install cloudflared

```bash
# Download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# macOS
brew install cloudflare/cloudflare/cloudflared

# Windows
# Download the .exe from the Cloudflare website

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

### Step 3: Create a Tunnel

```bash
# Create a tunnel
cloudflared tunnel create ollama-tunnel

# Note the tunnel ID from the output
```

### Step 4: Configure DNS

```bash
# Add DNS record (replace YOUR_DOMAIN and TUNNEL_ID)
cloudflared tunnel route dns ollama-tunnel ollama.yourdomain.com
```

### Step 5: Create Configuration File

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: ollama-tunnel
credentials-file: /path/to/tunnel/credentials.json

ingress:
  - hostname: ollama.yourdomain.com
    service: http://localhost:11434
  - service: http_status:404
```

### Step 6: Configure Ollama

```bash
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS="https://ollama.yourdomain.com,https://your-app.vercel.app"
ollama serve
```

### Step 7: Start the Tunnel

```bash
cloudflared tunnel run ollama-tunnel
```

### Step 8: Configure Your App

```bash
REACT_APP_OLLAMA_URL=https://ollama.yourdomain.com
```

## Method 4: Custom Domain + DDNS

This method provides a professional setup with your own domain.

### Step 1: Set Up Dynamic DNS

Choose a DDNS provider:
- **No-IP**: Free tier available
- **DuckDNS**: Free
- **Dynu**: Free tier available

Example with DuckDNS:

```bash
# Install DuckDNS client
curl -o duck.sh "https://www.duckdns.org/update?domains=yourdomain&token=YOUR_TOKEN&ip="
chmod +x duck.sh

# Add to crontab for automatic updates
echo "*/5 * * * * /path/to/duck.sh >/dev/null 2>&1" | crontab -
```

### Step 2: Configure Reverse Proxy

Install and configure nginx:

```bash
# Install nginx
sudo apt update
sudo apt install nginx

# Create configuration
sudo nano /etc/nginx/sites-available/ollama
```

nginx configuration:

```nginx
server {
    listen 80;
    server_name ollama.yourdomain.duckdns.org;
    
    location / {
        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

### Step 3: Enable SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d ollama.yourdomain.duckdns.org
```

### Step 4: Configure Ollama

```bash
export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_ORIGINS="https://ollama.yourdomain.duckdns.org,https://your-app.vercel.app"
ollama serve
```

### Step 5: Configure Your App

```bash
REACT_APP_OLLAMA_URL=https://ollama.yourdomain.duckdns.org
```

## Security Guidelines

### Essential Security Measures

1. **Use HTTPS**: Always use HTTPS in production
2. **Restrict Origins**: Configure `OLLAMA_ORIGINS` to only allow your app's domain
3. **Firewall Rules**: Block unnecessary ports
4. **Regular Updates**: Keep Ollama and system updated
5. **Monitor Access**: Check logs regularly for suspicious activity

### Recommended Ollama Configuration

```bash
# Secure configuration
export OLLAMA_HOST=127.0.0.1:11434  # Bind to localhost only (use with reverse proxy)
export OLLAMA_ORIGINS="https://your-app.vercel.app"  # Restrict to your app
export OLLAMA_KEEP_ALIVE=5m  # Unload models after 5 minutes of inactivity
export OLLAMA_MAX_LOADED_MODELS=1  # Limit resource usage
```

### Firewall Configuration

#### Linux (ufw)
```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp   # HTTP (for Let's Encrypt)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

#### Windows Firewall
```cmd
# Block Ollama port from external access (use reverse proxy instead)
netsh advfirewall firewall add rule name="Block Ollama External" dir=in action=block protocol=TCP localport=11434
```

### Network Security Best Practices

1. **Change Default Ports**: Use non-standard ports when possible
2. **Rate Limiting**: Implement rate limiting in your reverse proxy
3. **IP Whitelisting**: Restrict access to known IP ranges if possible
4. **VPN Access**: Consider VPN for additional security layer
5. **Regular Backups**: Backup your Ollama models and configurations

## Environment Configuration

### Development Environment

Create `.env.local`:

```bash
# Development (local Ollama)
REACT_APP_OLLAMA_URL=http://localhost:11434
REACT_APP_OLLAMA_MODEL=mistral
REACT_APP_USE_PROXY=false
REACT_APP_CORS_PROXY=
NODE_ENV=development
```

### Production Environment (Vercel)

Set environment variables in Vercel dashboard:

```bash
# Production (remote Ollama)
REACT_APP_OLLAMA_URL=https://ollama.yourdomain.com
REACT_APP_OLLAMA_MODEL=mistral
REACT_APP_USE_PROXY=false
REACT_APP_CORS_PROXY=
NODE_ENV=production
```

### Environment Variable Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_OLLAMA_URL` | Ollama server URL | `https://ollama.yourdomain.com` |
| `REACT_APP_OLLAMA_MODEL` | Default model name | `mistral` |
| `REACT_APP_USE_PROXY` | Enable CORS proxy | `false` |
| `REACT_APP_CORS_PROXY` | CORS proxy URL | `https://cors-anywhere.herokuapp.com/` |
| `REACT_APP_CONNECTION_TIMEOUT` | Request timeout (ms) | `45000` |
| `REACT_APP_RETRY_ATTEMPTS` | Max retry attempts | `3` |

## Troubleshooting

### Common Issues and Solutions

#### 1. Connection Refused

**Symptoms**: `ERR_CONNECTION_REFUSED` or `ECONNREFUSED`

**Causes & Solutions**:
- Ollama not running: `ollama serve`
- Wrong port: Check if Ollama is on port 11434
- Firewall blocking: Configure firewall rules
- Wrong IP/URL: Verify the connection URL

```bash
# Test local connection
curl http://localhost:11434/api/tags

# Test remote connection
curl https://your-tunnel-url/api/tags
```

#### 2. CORS Errors

**Symptoms**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Solutions**:
```bash
# Configure Ollama origins
export OLLAMA_ORIGINS="https://your-app.vercel.app,https://*.vercel.app"

# Or allow all origins (development only)
export OLLAMA_ORIGINS="*"

# Restart Ollama
pkill ollama && ollama serve
```

#### 3. Timeout Errors

**Symptoms**: Requests timing out, slow responses

**Solutions**:
- Increase timeout in your app configuration
- Check network connectivity
- Verify Ollama has sufficient resources
- Consider using a smaller model

```javascript
// Increase timeout in your app
const config = {
  timeout: 60000, // 60 seconds
  retryAttempts: 5
};
```

#### 4. Model Not Found

**Symptoms**: `model 'modelname' not found`

**Solutions**:
```bash
# List available models
ollama list

# Pull the required model
ollama pull mistral

# Verify model is available
curl http://localhost:11434/api/tags
```

#### 5. SSL/TLS Certificate Issues

**Symptoms**: `SSL_ERROR_*` or certificate warnings

**Solutions**:
- Renew Let's Encrypt certificates: `sudo certbot renew`
- Check certificate validity: `openssl s_client -connect yourdomain.com:443`
- Verify DNS propagation: `nslookup yourdomain.com`

#### 6. High Memory Usage

**Symptoms**: System running out of memory, Ollama crashes

**Solutions**:
```bash
# Limit loaded models
export OLLAMA_MAX_LOADED_MODELS=1

# Set keep-alive to unload models faster
export OLLAMA_KEEP_ALIVE=2m

# Use smaller models
ollama pull mistral:7b-instruct-q4_0  # Quantized version
```

#### 7. Port Already in Use

**Symptoms**: `bind: address already in use`

**Solutions**:
```bash
# Find process using port 11434
lsof -i :11434
# or
netstat -tulpn | grep 11434

# Kill the process
kill -9 PID

# Or use a different port
export OLLAMA_HOST=0.0.0.0:11435
```

### Debugging Steps

1. **Check Ollama Status**:
   ```bash
   ps aux | grep ollama
   curl http://localhost:11434/api/tags
   ```

2. **Verify Network Connectivity**:
   ```bash
   # Test from external network
   curl -I https://your-tunnel-url/api/tags
   
   # Check DNS resolution
   nslookup your-domain.com
   ```

3. **Check Logs**:
   ```bash
   # Ollama logs (if running as service)
   journalctl -u ollama -f
   
   # Or check terminal output where Ollama is running
   ```

4. **Test CORS**:
   ```bash
   # Test CORS headers
   curl -H "Origin: https://your-app.vercel.app" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        https://your-tunnel-url/api/generate
   ```

### Performance Optimization

#### System Requirements

- **Minimum RAM**: 8GB (for 7B models)
- **Recommended RAM**: 16GB+ (for larger models)
- **CPU**: Modern multi-core processor
- **Storage**: SSD recommended for model loading

#### Optimization Tips

1. **Use Quantized Models**:
   ```bash
   # Instead of full precision
   ollama pull mistral:7b-instruct
   
   # Use quantized version
   ollama pull mistral:7b-instruct-q4_0
   ```

2. **Optimize Keep-Alive**:
   ```bash
   # Balance between responsiveness and resource usage
   export OLLAMA_KEEP_ALIVE=5m
   ```

3. **Limit Concurrent Requests**:
   ```javascript
   // In your app, implement request queuing
   const requestQueue = new Queue({ concurrency: 1 });
   ```

## Testing Your Setup

### Basic Connectivity Test

```bash
# Test 1: Local connection
curl http://localhost:11434/api/tags

# Test 2: Remote connection
curl https://your-remote-url/api/tags

# Test 3: Generate response
curl https://your-remote-url/api/generate -d '{
  "model": "mistral",
  "prompt": "Hello, world!",
  "stream": false
}'
```

### Browser Testing

1. Open browser developer tools (F12)
2. Go to Console tab
3. Run this JavaScript:

```javascript
// Test connection from browser
fetch('https://your-remote-url/api/tags')
  .then(response => response.json())
  .then(data => console.log('Success:', data))
  .catch(error => console.error('Error:', error));
```

### End-to-End Testing

1. Deploy your app to Vercel with the remote Ollama URL
2. Open the deployed app in a browser
3. Test the chatbot functionality
4. Monitor network requests in developer tools
5. Check for any CORS or connectivity issues

### Load Testing

For production setups, consider load testing:

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test with 10 concurrent requests
ab -n 100 -c 10 -H "Content-Type: application/json" \
   -p test-payload.json \
   https://your-remote-url/api/generate
```

## Monitoring and Maintenance

### Health Monitoring

Create a simple health check script:

```bash
#!/bin/bash
# health-check.sh

OLLAMA_URL="https://your-remote-url"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$OLLAMA_URL/api/tags")

if [ "$RESPONSE" -eq 200 ]; then
    echo "$(date): Ollama is healthy"
else
    echo "$(date): Ollama is down (HTTP $RESPONSE)"
    # Add notification logic here (email, Slack, etc.)
fi
```

### Automated Restart

Create a systemd service for automatic restart:

```ini
# /etc/systemd/system/ollama.service
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
User=your-username
Environment=OLLAMA_HOST=0.0.0.0:11434
Environment=OLLAMA_ORIGINS=https://your-app.vercel.app
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ollama
sudo systemctl start ollama
```

### Log Rotation

Configure log rotation to prevent disk space issues:

```bash
# /etc/logrotate.d/ollama
/var/log/ollama.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 your-username your-username
}
```

## Conclusion

This guide covered four different methods for exposing Ollama remotely, each with different trade-offs between ease of setup, security, and reliability. Choose the method that best fits your needs:

- **ngrok**: Best for development and testing
- **Cloudflare Tunnel**: Best for production use
- **Custom Domain**: Best for professional deployments
- **Direct IP**: Only for temporary testing

Remember to always prioritize security, especially when exposing services to the internet. Regular monitoring and maintenance will ensure your setup remains reliable and secure.

For additional help, consult the [Ollama documentation](https://github.com/ollama/ollama) or reach out to the community for support.