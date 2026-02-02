const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');

// @route   POST /api/auth/register
// @desc    Register a new user (Student/Staff/Admin)
router.post('/register', upload.single('profilePic'), authController.register);

const authorize = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Login with Email or Unique ID
router.post('/login', authController.login);

// @route   GET /api/auth/profile
// @desc    Get Current User Profile
router.get('/profile', authorize(), authController.getProfile);

// @route   PUT /api/auth/profile
// @desc    Update User Profile
router.put('/profile', authorize(), upload.single('profilePic'), authController.updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change Password
router.put('/change-password', authorize(), authController.changePassword);

module.exports = router;
