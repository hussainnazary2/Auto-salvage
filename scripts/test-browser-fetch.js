#!/usr/bin/env node

/**
 * Browser Fetch Test Script
 * Creates a simple HTML page to test fetch requests in the browser
 */

const fs = require('fs');
const path = require('path');

const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Ollama Fetch Test</title>
</head>
<body>
    <h1>Ollama Connection Test</h1>
    <button onclick="testConnection()">Test Connection</button>
    <div id="results"></div>

    <script>
        async function testConnection() {
            const results = document.getElementById('results');
            results.innerHTML = '<p>Testing...</p>';
            
            try {
                console.log('Testing with no-cors mode...');
                
                const response = await fetch('http://localhost:11434/api/tags', {
                    method: 'GET',
                    mode: 'no-cors',
                    credentials: 'same-origin'
                });
                
                console.log('Response:', response);
                console.log('Response status:', response.status);
                console.log('Response type:', response.type);
                
                if (response.type === 'opaque') {
                    results.innerHTML = '<p style="color: orange;">✅ Request succeeded but response is opaque (expected with no-cors)</p>';
                    
                    // Try to make a chat request
                    console.log('Testing chat request...');
                    
                    const chatResponse = await fetch('http://localhost:11434/api/chat', {
                        method: 'POST',
                        mode: 'no-cors',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'mistral-nz-cars',
                            messages: [
                                {
                                    role: 'user',
                                    content: 'Hello, test message'
                                }
                            ],
                            stream: false
                        })
                    });
                    
                    console.log('Chat response:', chatResponse);
                    results.innerHTML += '<p style="color: green;">✅ Chat request also succeeded (opaque response)</p>';
                    
                } else {
                    const data = await response.json();
                    console.log('Response data:', data);
                    results.innerHTML = '<p style="color: green;">✅ Connection successful! Models: ' + 
                        (data.models ? data.models.length : 'unknown') + '</p>';
                }
                
            } catch (error) {
                console.error('Connection failed:', error);
                results.innerHTML = '<p style="color: red;">❌ Connection failed: ' + error.message + '</p>';
                
                // Try with CORS mode
                try {
                    console.log('Trying with CORS mode...');
                    const corsResponse = await fetch('http://localhost:11434/api/tags', {
                        method: 'GET',
                        mode: 'cors',
                        credentials: 'omit'
                    });
                    
                    const corsData = await corsResponse.json();
                    results.innerHTML += '<p style="color: blue;">ℹ️ CORS mode worked! Models: ' + 
                        (corsData.models ? corsData.models.length : 'unknown') + '</p>';
                        
                } catch (corsError) {
                    console.error('CORS mode also failed:', corsError);
                    results.innerHTML += '<p style="color: red;">❌ CORS mode also failed: ' + corsError.message + '</p>';
                }
            }
        }
        
        // Auto-run test on page load
        window.onload = function() {
            setTimeout(testConnection, 1000);
        };
    </script>
</body>
</html>
`;

// Write the test file
const testPath = path.join(process.cwd(), 'test-ollama-browser.html');
fs.writeFileSync(testPath, testHtml);

console.log('🌐 Browser test file created: test-ollama-browser.html');
console.log('');
console.log('📋 Instructions:');
console.log('1. Make sure Ollama is running: ollama serve');
console.log('2. Open test-ollama-browser.html in your browser');
console.log('3. Check the browser console for detailed logs');
console.log('4. The test will run automatically and show results');
console.log('');
console.log('💡 This will help us understand what\'s happening in the browser environment.');