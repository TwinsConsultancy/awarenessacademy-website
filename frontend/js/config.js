/**
 * AWARNESS ACADEMY - Application Configuration
 * Centralized configuration for the frontend
 */

const CONFIG = {
    // Feature Flags
    ENABLE_NOTIFICATIONS: true,
    ENABLE_CHATBOT: true,

    // Other Constants
    APP_NAME: 'InnerSpark',

    // API URLs - will be set based on environment below
    API_BASE_URL: '',
    CLIENT_URL: ''
};

// Auto-detect environment
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Production - use relative paths (same server serves frontend + backend)
    CONFIG.API_BASE_URL = '/api';
    CONFIG.CLIENT_URL = window.location.origin;
} else {
    // Development - use localhost
    CONFIG.API_BASE_URL = 'http://localhost:5001/api';
    CONFIG.CLIENT_URL = 'http://localhost:5001';
}
