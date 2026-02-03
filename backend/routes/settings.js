const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authorize = require('../middleware/auth');

// Public route to get basic settings (maintenance check, right click)
router.get('/public', settingsController.getPublicSettings);

// Protected routes for Admin
router.get('/', authorize(['Admin']), settingsController.getSettings);
router.put('/', authorize(['Admin']), settingsController.updateSettings);

module.exports = router;
