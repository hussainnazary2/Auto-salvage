# Troubleshooting Guide for Remote Ollama Access

This guide helps diagnose and fix common issues when connecting to remote Ollama instances.

## 🔍 Diagnostic Tools

### Quick Health Check Script
```bash
#!/bin/bash
# ollama-health-check.sh

OLLAMA_URL="${1:-http://localhost:11434}"
echo "Testing Ollama at: $OLLAMA_URL"

# Test 1: Basic connectivity
echo "1. Testing basic connectivity..."
if curl -s --connect-timeout 5 "$OLLAMA_URL/api/tags" > /dev/null; then
    echo "   ✅ Connection successful"
else
    echo "   ❌ Connection failed"
    exit 1
fi

# Test 2: API response
echo "2. Testing API response..."
RESPONSE=$(curl -s "$OLLAMA_URL/api/tags")
if echo "$RESPONSE" | jq . > /dev/null 2>&1; then
    echo "   ✅ Valid JSON response"
    echo "   Models available: $(echo "$RESPONSE" | jq -r '.models[].name' | tr '\n' ', ')"
else
    echo "   ❌ Invalid response: $RESPONSE"
fi

# Test 3: CORS headers (if remote)
if [[ "$OLLAMA_URL" != *"localhost"* ]]; then
    echo "3. Testing CORS headers..."
    CORS_RESPONSE=$(curl -s -I -H "Origin: https://example.com" "$OLLAMA_URL/api/tags")
    if echo "$CORS_RESPONSE" | grep -i "access-control-allow-origin" > /dev/null; then
        echo "   ✅ CORS headers present"
    else
        echo "   ⚠️  CORS headers missing"
    fi
fi

echo "Health check complete!"
```

### Browser Console Test
```javascript
// Run this in your browser console to test connectivity
async function testOllamaConnection(url) {
    console.log(`Testing connection to: ${url}`);
    
    try {
        const response = await fetch(`${url}/api/tags`);
        const data = await response.json();
        console.log('✅ Connection successful:', data);
        return true;
    } catch (error) {
        console.error('❌ Connection failed:', error);
        return false;
    }
}

// Test your Ollama URL
testOllamaConnection('https://your-ollama-url');
```

## 🚨 Common Issues & Solutions

### 1. Connection Refused (ERR_CONNECTION_REFUSED)

**Symptoms:**
- Browser shows "This site can't be reached"
- `curl` returns "Connection refused"
- Network tab shows failed requests

**Diagnostic Steps:**
```bash
# Check if Ollama is running locally
ps aux | grep ollama

# Check if port is open
netstat -tulpn | grep 11434
# or
lsof -i :11434

# Test local connection
curl http://localhost:11434/api/tags
```

**Solutions:**

1. **Ollama Not Running:**
   ```bash
   # Start Ollama
   ollama serve
   
   # Or as a service
   sudo systemctl start ollama
   ```

2. **Wrong Port/Host Configuration:**
   ```bash
   # Check Ollama configuration
   echo $OLLAMA_HOST
   
   # Set correct host
   export OLLAMA_HOST=0.0.0.0:11434
   ollama serve
   ```

3. **Firewall Blocking:**
   ```bash
   # Linux (ufw)
   sudo ufw allow 11434
   
   # Check iptables
   sudo iptables -L | grep 11434
   ```

4. **Tunnel Not Running:**
   ```bash
   # Check ngrok
   ps aux | grep ngrok
   
   # Restart ngrok
   ngrok http 11434
   
   # Check Cloudflare tunnel
   cloudflared tunnel list
   ```

### 2. CORS Errors

**Symptoms:**
- "Access to fetch blocked by CORS policy"
- Preflight request failures
- OPTIONS requests failing

**Diagnostic Steps:**
```bash
# Test CORS headers
curl -H "Origin: https://your-app.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-ollama-url/api/generate

# Check current Ollama origins
echo $OLLAMA_ORIGINS
```

**Solutions:**

1. **Configure Ollama Origins:**
   ```bash
   # For development (allow all)
   export OLLAMA_ORIGINS="*"
   
   # For production (specific domain)
   export OLLAMA_ORIGINS="https://your-app.vercel.app"
   
   # Multiple domains
   export OLLAMA_ORIGINS="https://your-app.vercel.app,https://staging.vercel.app"
   
   # Restart Ollama
   pkill ollama && ollama serve
   ```

2. **Reverse Proxy CORS:**
   ```nginx
   # Add to nginx config
   location / {
       add_header Access-Control-Allow-Origin "https://your-app.vercel.app" always;
       add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
       add_header Access-Control-Allow-Headers "Content-Type" always;
       
       if ($request_method = 'OPTIONS') {
           return 204;
       }
       
       proxy_pass http://localhost:11434;
   }
   ```

3. **Use CORS Proxy (Development Only):**
   ```javascript
   // In your app config
   const OLLAMA_URL = process.env.NODE_ENV === 'development' 
     ? 'http://localhost:11434'
     : 'https://cors-anywhere.herokuapp.com/https://your-ollama-url';
   ```

### 3. Timeout Errors

**Symptoms:**
- Requests timing out after 30+ seconds
- "Request timeout" errors
- Slow or no responses

**Diagnostic Steps:**
```bash
# Test response time
time curl https://your-ollama-url/api/tags

# Check system resources
top -p $(pgrep ollama)
free -h
df -h

# Test with smaller model
ollama run tinyllama "Hello"
```

**Solutions:**

1. **Increase Timeout in App:**
   ```javascript
   // In your service configuration
   const config = {
     timeout: 60000, // 60 seconds
     retryAttempts: 3,
     retryDelay: 2000
   };
   ```

2. **Optimize Ollama Performance:**
   ```bash
   # Use quantized models
   ollama pull mistral:7b-instruct-q4_0
   
   # Limit loaded models
   export OLLAMA_MAX_LOADED_MODELS=1
   
   # Reduce keep-alive time
   export OLLAMA_KEEP_ALIVE=2m
   ```

3. **Check Network Latency:**
   ```bash
   # Test ping to your server
   ping your-server-ip
   
   # Test with traceroute
   traceroute your-server-ip
   ```

### 4. Model Not Found

**Symptoms:**
- "model 'modelname' not found" error
- Empty model list
- 404 errors for model requests

**Diagnostic Steps:**
```bash
# List available models
ollama list

# Check model status
curl http://localhost:11434/api/tags

# Check disk space
df -h
```

**Solutions:**

1. **Pull Required Model:**
   ```bash
   # Pull the model
   ollama pull mistral
   
   # Verify it's available
   ollama list
   ```

2. **Check Model Name:**
   ```bash
   # List exact model names
   ollama list | grep -v "NAME"
   
   # Update your app config
   REACT_APP_OLLAMA_MODEL=mistral:latest
   ```

3. **Free Up Space:**
   ```bash
   # Remove unused models
   ollama rm unused-model
   
   # Check available space
   df -h
   ```

### 5. SSL/TLS Certificate Issues

**Symptoms:**
- "SSL_ERROR_*" messages
- Certificate warnings
- "Not secure" in browser

**Diagnostic Steps:**
```bash
# Check certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiry
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Test SSL configuration
curl -I https://your-domain.com
```

**Solutions:**

1. **Renew Let's Encrypt Certificate:**
   ```bash
   # Renew certificate
   sudo certbot renew
   
   # Test renewal
   sudo certbot renew --dry-run
   
   # Restart nginx
   sudo systemctl reload nginx
   ```

2. **Fix Certificate Chain:**
   ```bash
   # Check certificate chain
   openssl s_client -connect your-domain.com:443 -showcerts
   
   # Update nginx config with full chain
   ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
   ```

3. **Update DNS:**
   ```bash
   # Check DNS propagation
   nslookup your-domain.com
   dig your-domain.com
   ```

### 6. High Memory Usage / System Crashes

**Symptoms:**
- Ollama process killed
- Out of memory errors
- System becomes unresponsive

**Diagnostic Steps:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check Ollama memory usage
ps -p $(pgrep ollama) -o pid,ppid,cmd,%mem,%cpu

# Check system logs
journalctl -u ollama -n 50
dmesg | grep -i "killed process"
```

**Solutions:**

1. **Use Smaller Models:**
   ```bash
   # Remove large models
   ollama rm llama2:70b
   
   # Use quantized versions
   ollama pull mistral:7b-instruct-q4_0
   ```

2. **Limit Resource Usage:**
   ```bash
   # Limit loaded models
   export OLLAMA_MAX_LOADED_MODELS=1
   
   # Reduce keep-alive time
   export OLLAMA_KEEP_ALIVE=1m
   
   # Use systemd limits
   sudo systemctl edit ollama
   ```
   
   Add to the service file:
   ```ini
   [Service]
   MemoryLimit=8G
   CPUQuota=200%
   ```

3. **Add Swap Space:**
   ```bash
   # Create swap file
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   
   # Make permanent
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

### 7. Network Connectivity Issues

**Symptoms:**
- Intermittent connection failures
- Slow response times
- Connection drops

**Diagnostic Steps:**
```bash
# Test network stability
ping -c 10 your-server-ip

# Check network interface
ip addr show
ifconfig

# Test bandwidth
speedtest-cli

# Check for packet loss
mtr your-server-ip
```

**Solutions:**

1. **Implement Retry Logic:**
   ```javascript
   // In your app
   async function retryRequest(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
       }
     }
   }
   ```

2. **Use Connection Pooling:**
   ```javascript
   // Configure fetch with keep-alive
   const agent = new https.Agent({
     keepAlive: true,
     maxSockets: 5
   });
   ```

3. **Monitor Connection Quality:**
   ```bash
   # Create monitoring script
   #!/bin/bash
   while true; do
     if ! curl -s --max-time 5 https://your-ollama-url/api/tags > /dev/null; then
       echo "$(date): Connection failed"
     fi
     sleep 30
   done
   ```

## 🔧 Advanced Debugging

### Enable Debug Logging

1. **Ollama Debug Mode:**
   ```bash
   # Enable debug logging
   export OLLAMA_DEBUG=1
   ollama serve
   ```

2. **nginx Debug:**
   ```nginx
   # Add to nginx config
   error_log /var/log/nginx/error.log debug;
   access_log /var/log/nginx/access.log combined;
   ```

3. **Browser Network Tab:**
   - Open Developer Tools (F12)
   - Go to Network tab
   - Filter by "Fetch/XHR"
   - Monitor requests to Ollama

### Performance Profiling

```bash
# Monitor system performance
htop

# Monitor network connections
netstat -an | grep :11434

# Monitor disk I/O
iotop

# Check system limits
ulimit -a
```

### Log Analysis

```bash
# Analyze nginx access logs
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr

# Check for errors
grep -i error /var/log/nginx/error.log

# Monitor real-time logs
tail -f /var/log/nginx/access.log | grep -E "(40[0-9]|50[0-9])"
```

## 📋 Troubleshooting Checklist

When experiencing issues, work through this checklist:

### Basic Connectivity
- [ ] Ollama is running (`ps aux | grep ollama`)
- [ ] Port is open (`netstat -tulpn | grep 11434`)
- [ ] Local connection works (`curl localhost:11434/api/tags`)
- [ ] Firewall allows traffic
- [ ] Tunnel/proxy is running

### Configuration
- [ ] `OLLAMA_HOST` is set correctly
- [ ] `OLLAMA_ORIGINS` includes your app domain
- [ ] Environment variables are loaded
- [ ] Model is available (`ollama list`)
- [ ] Sufficient disk space and memory

### Network
- [ ] DNS resolves correctly (`nslookup your-domain.com`)
- [ ] SSL certificate is valid
- [ ] CORS headers are present
- [ ] No network connectivity issues
- [ ] Reasonable latency (`ping your-server`)

### Application
- [ ] Correct Ollama URL in app config
- [ ] Proper error handling in code
- [ ] Appropriate timeout settings
- [ ] CORS configuration matches server

## 🆘 Getting Help

If you're still experiencing issues:

1. **Gather Information:**
   ```bash
   # System info
   uname -a
   ollama --version
   
   # Configuration
   env | grep OLLAMA
   
   # Logs
   journalctl -u ollama -n 50
   ```

2. **Test with Minimal Setup:**
   ```bash
   # Stop all services
   pkill ollama
   pkill ngrok
   
   # Start with basic config
   export OLLAMA_HOST=0.0.0.0:11434
   export OLLAMA_ORIGINS="*"
   ollama serve
   
   # Test locally first
   curl http://localhost:11434/api/tags
   ```

3. **Community Resources:**
   - [Ollama GitHub Issues](https://github.com/ollama/ollama/issues)
   - [Ollama Discord](https://discord.gg/ollama)
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/ollama)

4. **Create Minimal Reproduction:**
   - Document exact steps to reproduce
   - Include error messages and logs
   - Specify your environment (OS, versions, etc.)
   - Test with different models/configurations

Remember: Most issues are configuration-related. Double-check your environment variables, network settings, and ensure all services are running correctly.