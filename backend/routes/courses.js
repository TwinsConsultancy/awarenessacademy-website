const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const jwt = require('jsonwebtoken');

// Utility to handle optional authentication for access checks
const optionalAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'innerspark_secret_key');
            req.user = decoded;
        } catch (err) {
            // Invalid token, proceed as guest
        }
    }
    next();
};

// @route   GET /api/courses/enrolled
// @desc    Get user's enrolled courses
router.get('/enrolled', optionalAuth, courseController.getEnrolledCourses);

// @route   GET /api/courses/marketplace
// @desc    Get all published courses
router.get('/marketplace', courseController.getMarketplace);

// @route   GET /api/courses/:id/preview
// @desc    Get course preview metadata (Public)
router.get('/:id/preview', courseController.getCoursePreview);

// @route   GET /api/courses/:id
// @desc    Get course details with optional auth for access check
router.get('/:id', optionalAuth, courseController.getCourseDetails);

// @route   POST /api/courses/track
// @desc    Track video play impression (Anonymous or Student)
router.post('/track', optionalAuth, courseController.trackImpression);

module.exports = router;
