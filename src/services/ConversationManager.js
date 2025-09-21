/**
 * Conversation Manager
 * Handles conversation history, context management, and message formatting
 */

class ConversationManager {
  constructor(maxHistoryLength = 10) {
    this.maxHistoryLength = maxHistoryLength;
    this.messages = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Add a message to the conversation history
   */
  addMessage(text, isBot = false, metadata = {}) {
    const message = {
      id: this.generateMessageId(),
      text: text.trim(),
      isBot,
      timestamp: new Date(),
      sessionId: this.sessionId,
      ...metadata
    };

    this.messages.push(message);
    
    // Manage context window - keep only recent messages
    if (this.messages.length > this.maxHistoryLength * 2) { // *2 to account for user+bot pairs
      this.messages = this.messages.slice(-this.maxHistoryLength * 2);
    }

    return message;
  }

  /**
   * Get formatted conversation history for display
   */
  getFormattedHistory() {
    return this.messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      isBot: msg.isBot,
      timestamp: msg.timestamp
    }));
  }

  /**
   * Get conversation context for Ollama (excluding system messages)
   */
  getContextForOllama() {
    // Return only user and assistant messages, excluding any system messages
    return this.messages
      .filter(msg => msg.text && msg.text.trim() !== '')
      .slice(-this.maxHistoryLength); // Keep only recent messages for context
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.messages = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Get the last message
   */
  getLastMessage() {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  /**
   * Get messages by type (user or bot)
   */
  getMessagesByType(isBot) {
    return this.messages.filter(msg => msg.isBot === isBot);
  }

  /**
   * Update a message (useful for streaming responses)
   */
  updateMessage(messageId, updates) {
    const messageIndex = this.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
      this.messages[messageIndex] = {
        ...this.messages[messageIndex],
        ...updates,
        timestamp: new Date() // Update timestamp on modification
      };
      return this.messages[messageIndex];
    }
    return null;
  }

  /**
   * Remove a message
   */
  removeMessage(messageId) {
    const messageIndex = this.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
      return this.messages.splice(messageIndex, 1)[0];
    }
    return null;
  }

  /**
   * Get conversation statistics
   */
  getStats() {
    const userMessages = this.getMessagesByType(false);
    const botMessages = this.getMessagesByType(true);
    
    return {
      totalMessages: this.messages.length,
      userMessages: userMessages.length,
      botMessages: botMessages.length,
      sessionId: this.sessionId,
      startTime: this.messages.length > 0 ? this.messages[0].timestamp : null,
      lastActivity: this.messages.length > 0 ? this.messages[this.messages.length - 1].timestamp : null
    };
  }

  /**
   * Manage context window to prevent token limit issues
   */
  manageContextWindow() {
    // If we have too many messages, remove older ones but keep the conversation flow
    if (this.messages.length > this.maxHistoryLength * 2) {
      // Keep the first message (usually a greeting) and recent messages
      const firstMessage = this.messages[0];
      const recentMessages = this.messages.slice(-this.maxHistoryLength * 2 + 1);
      
      this.messages = [firstMessage, ...recentMessages];
    }
  }

  /**
   * Export conversation for backup/analysis
   */
  exportConversation() {
    return {
      sessionId: this.sessionId,
      messages: this.messages,
      stats: this.getStats(),
      exportedAt: new Date()
    };
  }

  /**
   * Import conversation from backup
   */
  importConversation(conversationData) {
    if (conversationData && conversationData.messages) {
      this.messages = conversationData.messages;
      this.sessionId = conversationData.sessionId || this.generateSessionId();
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get conversation summary (useful for debugging)
   */
  getSummary() {
    const stats = this.getStats();
    return {
      sessionId: this.sessionId,
      messageCount: stats.totalMessages,
      userMessageCount: stats.userMessages,
      botMessageCount: stats.botMessages,
      duration: stats.startTime && stats.lastActivity ? 
        stats.lastActivity.getTime() - stats.startTime.getTime() : 0,
      lastActivity: stats.lastActivity
    };
  }

  /**
   * Check if conversation is empty
   */
  isEmpty() {
    return this.messages.length === 0;
  }

  /**
   * Get conversation length in characters (useful for token estimation)
   */
  getConversationLength() {
    return this.messages.reduce((total, msg) => total + msg.text.length, 0);
  }

  /**
   * Trim conversation to fit within character limit
   */
  trimToCharacterLimit(maxCharacters) {
    let totalLength = this.getConversationLength();
    
    while (totalLength > maxCharacters && this.messages.length > 1) {
      // Remove the oldest message (but keep at least one message)
      const removedMessage = this.messages.shift();
      totalLength -= removedMessage.text.length;
    }
  }

  /**
   * Set maximum history length
   */
  setMaxHistoryLength(maxLength) {
    this.maxHistoryLength = Math.max(1, maxLength);
    this.manageContextWindow();
  }

  /**
   * Get messages within a time range
   */
  getMessagesInTimeRange(startTime, endTime) {
    return this.messages.filter(msg => 
      msg.timestamp >= startTime && msg.timestamp <= endTime
    );
  }

  /**
   * Search messages by text content
   */
  searchMessages(query) {
    const lowerQuery = query.toLowerCase();
    return this.messages.filter(msg => 
      msg.text.toLowerCase().includes(lowerQuery)
    );
  }
}

export default ConversationManager;