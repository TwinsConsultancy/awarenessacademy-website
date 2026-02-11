const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authorize = require('../middleware/auth');

// All payment routes require authentication
router.use(authorize(['Student', 'Admin']));

// New Razorpay endpoints
// @route   POST /api/payments/initialize
// @desc    Initialize payment and create Razorpay order
router.post('/initialize', paymentController.initializePayment);

// @route   POST /api/payments/verify
// @desc    Verify payment and complete enrollment
router.post('/verify', paymentController.verifyPayment);

// @route   POST /api/payments/failure
// @desc    Handle payment failure
router.post('/failure', paymentController.handlePaymentFailure);

// @route   GET /api/payments/my
// @desc    Get current user's payments
router.get('/my', paymentController.getMyPayments);

// @route   GET /api/payments/:transactionId
// @desc    Get specific payment details
router.get('/:transactionId', paymentController.getPaymentDetails);

// Legacy endpoints (kept for backwards compatibility)
// @route   POST /api/payments/process
// @desc    Process a course payment and enroll student (DEPRECATED)
router.post('/process', paymentController.processPayment);

// @route   POST /api/payments/validate-coupon
router.post('/validate-coupon', paymentController.validateCoupon);

module.exports = router;
