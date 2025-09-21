# Vercel Quick Start Guide

## 🚀 5-Minute Deployment

### Prerequisites
- Ollama running on your PC with a model loaded
- Vercel account and CLI installed (`npm i -g vercel`)

### Step 1: Expose Ollama (Choose One)

#### Option A: ngrok (Fastest)
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Expose with ngrok
ngrok http 11434
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

#### Option B: Cloudflare Tunnel
```bash
cloudflared tunnel --url http://localhost:11434
# Copy the HTTPS URL
```

### Step 2: Configure CORS
```bash
# Set allowed origins (replace with your Vercel URL)
export OLLAMA_ORIGINS="https://your-app.vercel.app,https://*.vercel.app"

# Restart Ollama
ollama serve
```

### Step 3: Deploy to Vercel
```bash
# Login and setup
vercel login
vercel

# Set environment variables
vercel env add REACT_APP_OLLAMA_URL
# Enter your ngrok/tunnel URL

vercel env add REACT_APP_OLLAMA_MODEL  
# Enter your model name (e.g., mistral-nz-cars)

# Deploy
npm run deploy:production
```

### Step 4: Test
1. Open your Vercel app URL
2. Test the chatbot
3. Verify connection status shows "Connected"

## 🔧 Environment Variables Checklist

Required for production:
- ✅ `REACT_APP_OLLAMA_URL` - Your Ollama endpoint
- ✅ `REACT_APP_OLLAMA_MODEL` - Model name
- ✅ `REACT_APP_CORS_MODE=cors`
- ✅ `REACT_APP_OLLAMA_TIMEOUT=45000`

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error | Check `OLLAMA_ORIGINS` on your PC |
| Connection timeout | Verify PC is online and accessible |
| Model not found | Run `ollama pull your-model-name` |
| Build fails | Run `npm run env:check` |

## 📱 Testing Checklist

- [ ] Chatbot shows "Connected" status
- [ ] Can send and receive messages
- [ ] Error handling works (stop Ollama, test reconnection)
- [ ] Works on mobile devices
- [ ] Response times are acceptable

## 🔄 Update Process

```bash
# Make changes
git add .
git commit -m "Update"
git push

# Redeploy (if not auto-deploying)
npm run deploy:production
```

Need detailed instructions? See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)