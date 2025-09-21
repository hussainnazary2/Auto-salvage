# Quick Setup Reference

This is a condensed reference for developers who need to quickly set up remote Ollama access.

## 🚀 Quick Start (ngrok - Recommended for Development)

### 1. Install and Setup ngrok
```bash
# Install ngrok
brew install ngrok/ngrok/ngrok  # macOS
# or download from https://ngrok.com/download

# Authenticate (get token from https://ngrok.com)
ngrok config add-authtoken YOUR_TOKEN
```

### 2. Configure Ollama
```bash
# Set environment variables
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS="*.ngrok.io,*.ngrok-free.app"

# Start Ollama
ollama serve
```

### 3. Start Tunnel
```bash
# In new terminal
ngrok http 11434
# Copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)
```

### 4. Configure Your App
```bash
# Set in Vercel environment variables
REACT_APP_OLLAMA_URL=https://abc123.ngrok-free.app
```

## 🔒 Production Setup (Cloudflare Tunnel)

### 1. Install cloudflared
```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 2. Setup Tunnel
```bash
# Login and create tunnel
cloudflared tunnel login
cloudflared tunnel create ollama-tunnel

# Configure DNS (replace with your domain)
cloudflared tunnel route dns ollama-tunnel ollama.yourdomain.com
```

### 3. Create Config File
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: ollama-tunnel
credentials-file: /path/to/tunnel/credentials.json

ingress:
  - hostname: ollama.yourdomain.com
    service: http://localhost:11434
  - service: http_status:404
```

### 4. Configure Ollama
```bash
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS="https://ollama.yourdomain.com,https://your-app.vercel.app"
ollama serve
```

### 5. Start Tunnel
```bash
cloudflared tunnel run ollama-tunnel
```

## 🛠️ Environment Variables

### Development (.env.local)
```bash
REACT_APP_OLLAMA_URL=http://localhost:11434
REACT_APP_OLLAMA_MODEL=mistral
NODE_ENV=development
```

### Production (Vercel)
```bash
REACT_APP_OLLAMA_URL=https://your-tunnel-url
REACT_APP_OLLAMA_MODEL=mistral
NODE_ENV=production
```

## 🔍 Quick Troubleshooting

### Test Connection
```bash
# Local test
curl http://localhost:11434/api/tags

# Remote test
curl https://your-tunnel-url/api/tags
```

### Common Fixes

**CORS Error:**
```bash
export OLLAMA_ORIGINS="*"  # Development only
# or
export OLLAMA_ORIGINS="https://your-app.vercel.app"
```

**Connection Refused:**
```bash
# Check if Ollama is running
ps aux | grep ollama

# Restart Ollama
pkill ollama && ollama serve
```

**Model Not Found:**
```bash
# List models
ollama list

# Pull model
ollama pull mistral
```

## 📋 Security Checklist

- [ ] Use HTTPS in production
- [ ] Restrict OLLAMA_ORIGINS to your app domain
- [ ] Enable firewall rules
- [ ] Use strong authentication for tunnel services
- [ ] Monitor access logs
- [ ] Keep Ollama updated
- [ ] Use quantized models to reduce resource usage
- [ ] Set up automatic restarts
- [ ] Configure log rotation
- [ ] Test backup and recovery procedures

## 🚨 Emergency Commands

### Stop Everything
```bash
# Kill Ollama
pkill ollama

# Stop ngrok
pkill ngrok

# Stop Cloudflare tunnel
pkill cloudflared
```

### Quick Restart
```bash
# Restart Ollama with secure config
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS="https://your-app.vercel.app"
ollama serve
```

### Check System Resources
```bash
# Memory usage
free -h

# Disk usage
df -h

# Process list
top -p $(pgrep ollama)
```

## 📞 Support Resources

- [Ollama GitHub](https://github.com/ollama/ollama)
- [ngrok Documentation](https://ngrok.com/docs)
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)