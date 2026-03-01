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

// Production URLs
CONFIG.API_BASE_URL = 'https://awarenessacademy.in/api';
CONFIG.CLIENT_URL = 'https://awarenessacademy.in';
