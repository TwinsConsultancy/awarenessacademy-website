const express = require('express');
const router = express.Router();
const { Feedback } = require('../models/index');
const authorize = require('../middleware/auth');

// POST /api/feedback/submit  — any authenticated user (Student/Staff/Admin)
router.post('/submit', authorize(['Student', 'Staff', 'Admin']), async (req, res) => {
    try {
        console.log('=== FEEDBACK SUBMISSION DEBUG ===');
        console.log('Full request user object:', JSON.stringify(req.user, null, 2));
        console.log('Request user ID:', req.user?.id);
        console.log('Request user _id:', req.user?._id);
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        const {
            moduleId,
            moduleName,
            courseId,
            videoQuality,
            contentQuality,
            contentRelevance,
            expectations,
            recommendation,
            comments
        } = req.body;

        if (!moduleId) {
            console.log('Missing moduleId in feedback submission');
            return res.status(400).json({ success: false, message: 'moduleId is required' });
        }

        if (!req.user) {
            console.log('No user object in request');
            return res.status(401).json({ success: false, message: 'User authentication required' });
        }

        // Try both id and _id to ensure we get the user ID
        const userId = req.user.id || req.user._id;
        if (!userId) {
            console.log('Missing user ID - user object:', req.user);
            return res.status(401).json({ success: false, message: 'User ID not found in authentication' });
        }

        console.log('Using user ID for feedback:', userId);

        // Check for duplicate feedback submission
        const existingFeedback = await Feedback.findOne({ 
            moduleId: moduleId, 
            studentId: userId 
        });

        if (existingFeedback) {
            console.log('Duplicate feedback attempt for module:', moduleId, 'user:', userId);
            return res.status(400).json({ 
                success: false, 
                message: 'You have already submitted feedback for this module',
                duplicate: true
            });
        }

        const feedbackData = {
            moduleId,
            moduleName: moduleName || 'Unknown Module',
            courseId: courseId || null,
            studentId: userId,
            ratings: {
                videoQuality: Number(videoQuality) || 0,
                contentQuality: Number(contentQuality) || 0,
                contentRelevance: Number(contentRelevance) || 0,
                expectations: Number(expectations) || 0,
                recommendation: Number(recommendation) || 0
            },
            comments: comments || '',
            overallRating: Number((
                (Number(videoQuality) + Number(contentQuality) + Number(contentRelevance) +
                    Number(expectations) + Number(recommendation)) / 5
            ).toFixed(1))
        };

        console.log('Creating feedback with data:', JSON.stringify(feedbackData, null, 2));
        
        const feedback = new Feedback(feedbackData);

        await feedback.save();
        console.log('Feedback submitted successfully for user:', userId, 'module:', moduleId);

        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            data: { feedbackId: feedback._id }
        });

    } catch (error) {
        console.error('=== FEEDBACK SUBMISSION ERROR ===');
        console.error('Error object:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('User context:', req.user);
        console.error('Request body:', req.body);
        
        // Check for specific validation errors
        if (error.name === 'ValidationError') {
            console.error('Validation errors details:');
            const validationErrors = Object.keys(error.errors).map(key => {
                console.error(`- Field '${key}': ${error.errors[key].message}`);
                console.error(`  Value: ${error.errors[key].value}`);
                console.error(`  Kind: ${error.errors[key].kind}`);
                return {
                    field: key,
                    message: error.errors[key].message,
                    value: error.errors[key].value,
                    kind: error.errors[key].kind
                };
            });
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Failed to submit feedback', 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/feedback/check/:moduleId
// Check if current user has already submitted feedback for a module
router.get('/check/:moduleId', authorize(['Student', 'Staff', 'Admin']), async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const moduleId = req.params.moduleId;

        const existingFeedback = await Feedback.findOne({ 
            moduleId: moduleId, 
            studentId: userId 
        });

        res.json({ 
            success: true, 
            hasSubmitted: !!existingFeedback,
            feedback: existingFeedback 
        });
    } catch (error) {
        console.error('Error checking feedback status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to check feedback status' 
        });
    }
});

// GET /api/feedback/module/:moduleId
// Get all feedback for a module (admin/staff only)
router.get('/module/:moduleId', authorize(['Admin', 'Staff']), async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ moduleId: req.params.moduleId })
            .populate('studentId', 'name email studentID')
            .sort({ createdAt: -1 });

        const avgRatings = feedbacks.length ? {
            videoQuality: (feedbacks.reduce((s, f) => s + f.ratings.videoQuality, 0) / feedbacks.length).toFixed(1),
            contentQuality: (feedbacks.reduce((s, f) => s + f.ratings.contentQuality, 0) / feedbacks.length).toFixed(1),
            contentRelevance: (feedbacks.reduce((s, f) => s + f.ratings.contentRelevance, 0) / feedbacks.length).toFixed(1),
            expectations: (feedbacks.reduce((s, f) => s + f.ratings.expectations, 0) / feedbacks.length).toFixed(1),
            recommendation: (feedbacks.reduce((s, f) => s + f.ratings.recommendation, 0) / feedbacks.length).toFixed(1),
            overall: (feedbacks.reduce((s, f) => s + f.overallRating, 0) / feedbacks.length).toFixed(1),
        } : null;

        res.json({ success: true, data: { feedbacks, avgRatings, total: feedbacks.length } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/feedback/course/:courseId
// Get all feedback for a course (admin/staff only)
router.get('/course/:courseId', authorize(['Admin', 'Staff']), async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ courseId: req.params.courseId })
            .populate('studentId', 'name email studentID profileImage')
            .sort({ createdAt: -1 });

        // Overall course averages
        const avgRatings = feedbacks.length ? {
            videoQuality: (feedbacks.reduce((s, f) => s + f.ratings.videoQuality, 0) / feedbacks.length).toFixed(1),
            contentQuality: (feedbacks.reduce((s, f) => s + f.ratings.contentQuality, 0) / feedbacks.length).toFixed(1),
            contentRelevance: (feedbacks.reduce((s, f) => s + f.ratings.contentRelevance, 0) / feedbacks.length).toFixed(1),
            expectations: (feedbacks.reduce((s, f) => s + f.ratings.expectations, 0) / feedbacks.length).toFixed(1),
            recommendation: (feedbacks.reduce((s, f) => s + f.ratings.recommendation, 0) / feedbacks.length).toFixed(1),
            overall: (feedbacks.reduce((s, f) => s + f.overallRating, 0) / feedbacks.length).toFixed(1),
        } : null;

        // Rating distribution (1-5 stars)
        const distribution = [0, 0, 0, 0, 0];
        feedbacks.forEach(f => {
            const rounded = Math.round(f.overallRating);
            if (rounded >= 1 && rounded <= 5) distribution[rounded - 1]++;
        });

        res.json({
            success: true,
            data: {
                feedbacks,
                avgRatings,
                total: feedbacks.length,
                distribution
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
