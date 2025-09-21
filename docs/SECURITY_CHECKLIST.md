# Security Checklist for Remote Ollama Access

This checklist ensures your remote Ollama setup follows security best practices.

## 🔒 Pre-Deployment Security Checklist

### Network Security
- [ ] **Use HTTPS Only**: Never expose Ollama over HTTP in production
- [ ] **Restrict Origins**: Configure `OLLAMA_ORIGINS` to specific domains only
- [ ] **Firewall Configuration**: Block unnecessary ports and services
- [ ] **VPN Access**: Consider VPN for additional security layer
- [ ] **Network Segmentation**: Isolate Ollama server from other services

### Authentication & Authorization
- [ ] **Tunnel Authentication**: Use authenticated tunnels (ngrok Pro, Cloudflare)
- [ ] **API Keys**: Implement API key authentication if available
- [ ] **Rate Limiting**: Configure rate limiting to prevent abuse
- [ ] **IP Whitelisting**: Restrict access to known IP ranges when possible
- [ ] **Access Logs**: Enable and monitor access logs

### System Security
- [ ] **Regular Updates**: Keep Ollama and system packages updated
- [ ] **Minimal Permissions**: Run Ollama with minimal required permissions
- [ ] **Secure Configuration**: Use secure default configurations
- [ ] **Resource Limits**: Set memory and CPU limits for Ollama process
- [ ] **Backup Strategy**: Implement regular backups of models and configs

## 🛡️ Configuration Security

### Ollama Configuration
```bash
# ✅ Secure configuration
export OLLAMA_HOST=127.0.0.1:11434  # Localhost only (with reverse proxy)
export OLLAMA_ORIGINS="https://your-app.vercel.app"  # Specific domain
export OLLAMA_KEEP_ALIVE=5m  # Unload models to save resources
export OLLAMA_MAX_LOADED_MODELS=1  # Limit resource usage

# ❌ Insecure configuration (avoid in production)
export OLLAMA_HOST=0.0.0.0:11434  # Exposed to all interfaces
export OLLAMA_ORIGINS="*"  # Allows any origin
```

### Environment Variables Security
- [ ] **No Hardcoded Secrets**: Never commit secrets to version control
- [ ] **Environment Isolation**: Use different configs for dev/staging/prod
- [ ] **Secret Management**: Use proper secret management tools
- [ ] **Variable Validation**: Validate environment variables on startup
- [ ] **Minimal Exposure**: Only expose necessary configuration

### Reverse Proxy Security (nginx example)
```nginx
server {
    listen 443 ssl http2;
    server_name ollama.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=ollama:10m rate=10r/m;
    limit_req zone=ollama burst=5 nodelay;
    
    # CORS (restrictive)
    add_header Access-Control-Allow-Origin "https://your-app.vercel.app" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    
    location / {
        proxy_pass http://127.0.0.1:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## 🔍 Monitoring & Alerting

### Security Monitoring
- [ ] **Access Logs**: Monitor and analyze access patterns
- [ ] **Failed Requests**: Alert on high failure rates
- [ ] **Unusual Traffic**: Detect and alert on traffic anomalies
- [ ] **Resource Usage**: Monitor CPU, memory, and disk usage
- [ ] **Certificate Expiry**: Monitor SSL certificate expiration

### Log Analysis
```bash
# Monitor access logs for suspicious activity
tail -f /var/log/nginx/access.log | grep -E "(40[0-9]|50[0-9])"

# Check for brute force attempts
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10

# Monitor Ollama process
ps aux | grep ollama
netstat -tulpn | grep 11434
```

### Alerting Setup
```bash
# Example: Simple email alert for service down
#!/bin/bash
# check-ollama.sh

if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "Ollama service is down!" | mail -s "Ollama Alert" admin@yourdomain.com
fi
```

## 🚨 Incident Response

### Security Incident Checklist
- [ ] **Immediate Response**: Stop the service if compromised
- [ ] **Assess Damage**: Check what data/models were accessed
- [ ] **Contain Threat**: Block malicious IPs, revoke access
- [ ] **Investigate**: Analyze logs to understand the breach
- [ ] **Recover**: Restore from clean backups if necessary
- [ ] **Prevent**: Update security measures to prevent recurrence

### Emergency Commands
```bash
# Immediately stop Ollama
sudo systemctl stop ollama
# or
pkill -9 ollama

# Block suspicious IP
sudo ufw deny from SUSPICIOUS_IP

# Check active connections
netstat -an | grep :11434

# Review recent access logs
tail -100 /var/log/nginx/access.log
```

## 🔧 Security Testing

### Penetration Testing Checklist
- [ ] **Port Scanning**: Verify only necessary ports are open
- [ ] **SSL Testing**: Check SSL configuration and certificates
- [ ] **CORS Testing**: Verify CORS policies are restrictive
- [ ] **Rate Limiting**: Test rate limiting effectiveness
- [ ] **Input Validation**: Test for injection vulnerabilities

### Security Testing Commands
```bash
# Port scan
nmap -sS -O your-domain.com

# SSL test
sslscan your-domain.com:443

# CORS test
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-domain.com/api/generate

# Rate limiting test
for i in {1..20}; do
    curl https://your-domain.com/api/tags &
done
```

## 📋 Compliance Considerations

### Data Privacy
- [ ] **Data Retention**: Implement data retention policies
- [ ] **Data Encryption**: Encrypt data in transit and at rest
- [ ] **User Consent**: Obtain proper consent for data processing
- [ ] **Data Minimization**: Only collect necessary data
- [ ] **Right to Deletion**: Implement data deletion capabilities

### Regulatory Compliance
- [ ] **GDPR Compliance**: If serving EU users
- [ ] **CCPA Compliance**: If serving California users
- [ ] **Industry Standards**: Follow relevant industry security standards
- [ ] **Audit Trail**: Maintain comprehensive audit logs
- [ ] **Documentation**: Keep security documentation up to date

## 🔄 Regular Security Maintenance

### Weekly Tasks
- [ ] Review access logs for anomalies
- [ ] Check system resource usage
- [ ] Verify backup integrity
- [ ] Update security patches

### Monthly Tasks
- [ ] Review and rotate access credentials
- [ ] Update security configurations
- [ ] Conduct security scans
- [ ] Review incident response procedures

### Quarterly Tasks
- [ ] Comprehensive security audit
- [ ] Penetration testing
- [ ] Update security policies
- [ ] Security training for team members

## 🆘 Emergency Contacts

Prepare emergency contact information:

```yaml
# emergency-contacts.yml
security_team:
  primary: security@yourdomain.com
  phone: +1-555-0123

hosting_provider:
  support: support@vercel.com
  emergency: emergency@vercel.com

tunnel_provider:
  ngrok: support@ngrok.com
  cloudflare: support@cloudflare.com

system_admin:
  primary: admin@yourdomain.com
  backup: backup-admin@yourdomain.com
```

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls/)
- [Cloudflare Security Best Practices](https://developers.cloudflare.com/fundamentals/get-started/security/)
- [nginx Security Guide](https://nginx.org/en/docs/http/securing_http.html)

Remember: Security is an ongoing process, not a one-time setup. Regularly review and update your security measures to address new threats and vulnerabilities.