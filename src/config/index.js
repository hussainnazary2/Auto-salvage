/**
 * Configuration module entry point
 * Provides easy access to chatbot configuration
 */

import chatbotConfig, { ChatbotConfig, ConfigurationError } from './ChatbotConfig';

// Export the singleton instance as default
export default chatbotConfig;

// Export the class and error for advanced usage
export { ChatbotConfig, ConfigurationError };

// Export convenience methods
export const getOllamaConfig = () => chatbotConfig.getOllamaConfig();
export const getChatConfig = () => chatbotConfig.getChatConfig();
export const getUIConfig = () => chatbotConfig.getUIConfig();
export const getNetworkConfig = () => chatbotConfig.getNetworkConfig();

// Export validation helpers
export const isConfigValid = () => chatbotConfig.isValid();
export const getConfigErrors = () => chatbotConfig.getValidationErrors();
export const getConfigSummary = () => chatbotConfig.getConfigSummary();