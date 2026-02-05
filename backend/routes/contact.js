const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authorize = require('../middleware/auth');

// Public route - Submit contact form
router.post('/', contactController.submitContactMessage);

// Admin routes - Require authentication and admin role
router.get('/admin/stats', authorize(['Admin']), contactController.getStats);
router.get('/admin/:id', authorize(['Admin']), contactController.getMessage);
router.get('/admin', authorize(['Admin']), contactController.getAllMessages);
router.patch('/admin/:id', authorize(['Admin']), contactController.updateMessage);
router.delete('/admin/:id', authorize(['Admin']), contactController.deleteMessage);

module.exports = router;
