const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Optional auth for tracking
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

router.post('/track', optionalAuth, analyticsController.trackImpression);

module.exports = router;
