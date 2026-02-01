const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authorize = require('../middleware/auth');

// All payment routes require authentication
router.use(authorize(['Student', 'Admin']));

// @route   POST /api/payments/process
// @desc    Process a course payment and enroll student
router.post('/process', paymentController.processPayment);

// @route   GET /api/payments/my
// @desc    Get current user's payments
router.get('/my', paymentController.getMyPayments);

// @route   POST /api/payments/validate-coupon
router.post('/validate-coupon', paymentController.validateCoupon);

module.exports = router;
