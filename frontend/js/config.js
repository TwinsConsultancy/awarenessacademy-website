/**
 * InnerSpark - Application Configuration
 * Centralized configuration for the frontend
 */

const CONFIG = {
    API_BASE_URL: 'http://localhost:5001/api', // Default to local for development
    CLIENT_URL: 'http://localhost:5001',

    // Feature Flags
    ENABLE_NOTIFICATIONS: true,
    ENABLE_CHATBOT: true,

    // Other Constants
    APP_NAME: 'InnerSpark'
};

// Auto-detect environment
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol !== 'file:') {
    // Production (assume same origin)
    CONFIG.API_BASE_URL = '/api';
}
