const express = require('express');
const router = express.Router();
const { Feedback } = require('../models/index');
const authorize = require('../middleware/auth');

// POST /api/feedback/submit  — any authenticated user (Student/Staff/Admin)
router.post('/submit', authorize(['Student', 'Staff', 'Admin']), async (req, res) => {
    try {
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
            return res.status(400).json({ success: false, message: 'moduleId is required' });
        }

        const feedback = new Feedback({
            moduleId,
            moduleName: moduleName || 'Unknown Module',
            courseId: courseId || null,
            studentId: req.user._id,
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
        });

        await feedback.save();

        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            data: { feedbackId: feedback._id }
        });

    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to submit feedback', error: error.message });
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

module.exports = router;
