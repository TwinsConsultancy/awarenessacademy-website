const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const authorize = require('../middleware/auth');

// Chatbot can be used by anyone (guests too), but we track if logged in
const optionalAuth = (req, res, next) => {
    const jwt = require('jsonwebtoken');
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'innerspark_secret_key');
            req.user = decoded;
        } catch (err) { }
    }
    next();
};

// @route   POST /api/chatbot/ask
// @desc    Get a response from the Spiritual Guide
router.post('/ask', optionalAuth, chatbotController.getBotResponse);

module.exports = router;
