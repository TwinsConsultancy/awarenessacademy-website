const express = require('express');
const router = express.Router();
const extraController = require('../controllers/extraController');
const authorize = require('../middleware/auth');

// Public routes
router.get('/blogs', extraController.getBlogs);
router.get('/blogs/:id', extraController.getBlogById);
router.get('/events', extraController.getEvents);
router.post('/newsletter', extraController.subscribeNewsletter);

// Protected routes (Admin only)
router.post('/blogs', authorize(['Admin']), extraController.createBlog);
router.post('/events', authorize(['Admin']), extraController.createEvent);

module.exports = router;
