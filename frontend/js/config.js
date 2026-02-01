/**
 * InnerSpark - Application Configuration
 * Centralized configuration for the frontend
 */

const CONFIG = {
    // API_BASE_URL: 'http://localhost:5000/api', // Local Development
    API_BASE_URL: '/api', // Relative path for production/same-origin

    // Feature Flags
    ENABLE_NOTIFICATIONS: true,
    ENABLE_CHATBOT: true,

    // Other Constants
    APP_NAME: 'InnerSpark'
};

// Auto-detect environment if needed (optional)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    CONFIG.API_BASE_URL = 'http://localhost:5000/api';
}
