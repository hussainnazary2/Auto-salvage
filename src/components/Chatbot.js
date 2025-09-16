import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your car buying assistant powered by Ollama's mistral-nz-cars model. How can I help you today?", isBot: true }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      isBot: false
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Add bot response placeholder
      const botMessageId = messages.length + 2;
      const botMessage = {
        id: botMessageId,
        text: "",
        isBot: true
      };
      setMessages(prev => [...prev, botMessage]);
      
      // Call Ollama API with streaming
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-nz-cars', // Using the correct model for this application
          prompt: inputValue,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botResponse = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the chunk
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const data = JSON.parse(line);
            if (data.response) {
              botResponse += data.response;
              // Update the bot message with the partial response
              setMessages(prev => prev.map(msg => 
                msg.id === botMessageId ? { ...msg, text: botResponse } : msg
              ));
            }
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      let errorMessageText = "Sorry, I'm having trouble connecting to the AI service. ";
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessageText += "Please make sure Ollama is running and accessible.";
      } else if (error.message.includes('HTTP error')) {
        errorMessageText += `Server responded with status: ${error.message.split('status: ')[1]}`;
      } else {
        errorMessageText += "Please check the console for more details.";
      }
      
      // Add error message to chat
      const errorMessage = {
        id: messages.length + 2,
        text: errorMessageText,
        isBot: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>Car Buying Assistant</h3>
            <button className="close-btn" onClick={toggleChatbot}>×</button>
          </div>
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}
              >
                {message.text}
              </div>
            ))}
            {isLoading && (
              <div className="message bot-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chatbot-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !inputValue.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
      <button className="chatbot-button" onClick={toggleChatbot}>
        {isOpen ? '×' : '💬'}
      </button>
    </div>
  );
};

export default Chatbot;