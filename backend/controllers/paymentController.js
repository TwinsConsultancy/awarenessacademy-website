const { User, Payment, Course, Enrollment } = require('../models/index');
const razorpayService = require('../utils/razorpayService');
const emailService = require('../utils/emailService');
const crypto = require('crypto');

/**
 * Initialize Payment - Create Razorpay Order
 * POST /api/payments/initialize
 */
exports.initializePayment = async (req, res) => {
    try {
        const { courseId, couponCode } = req.body;
        const studentId = req.user.id;

        // Validate course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({
            studentID: studentId,
            courseID: courseId,
            status: 'Active'
        });

        if (existingEnrollment) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }

        // Validate user profile completion
        const user = await User.findById(studentId);
        const profileCompletion = calculateProfileCompletion(user);
        if (profileCompletion < 100) {
            return res.status(400).json({ 
                message: 'Please complete your profile before enrolling',
                profileCompletion 
            });
        }

        // Apply coupon if provided
        let finalAmount = course.price;
        let discountAmount = 0;
        let appliedCoupon = null;

        if (couponCode) {
            try {
                const { Coupon } = require('../models/index');
                const coupon = await Coupon.findOne({ 
                    code: couponCode.toUpperCase(), 
                    active: true 
                });

                if (coupon && (!coupon.expiryDate || new Date() <= coupon.expiryDate)) {
                    discountAmount = Math.round(course.price * (coupon.discountPercent / 100));
                    finalAmount = course.price - discountAmount;
                    appliedCoupon = coupon.code;
                }
            } catch (couponError) {
                console.error('Coupon validation error:', couponError);
                // Continue without coupon
            }
        }

        // Validate amount (minimum ₹1.00)
        if (finalAmount < 1) {
            return res.status(400).json({ 
                message: 'Invalid payment amount. Minimum amount is ₹1.00' 
            });
        }

        // Round amount to 2 decimal places for currency precision
        finalAmount = Math.round(finalAmount * 100) / 100;

        // Generate receipt ID
        const receiptId = razorpayService.generateReceiptId(studentId, courseId);
        
        // Create Razorpay order
        const orderResult = await razorpayService.createOrder(
            finalAmount,
            'INR',
            receiptId
        );

        if (!orderResult.success) {
            return res.status(500).json({ 
                message: 'Failed to create payment order',
                error: orderResult.error 
            });
        }

        // Generate internal transaction ID
        const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        // Create payment record
        const payment = new Payment({
            razorpayOrderId: orderResult.order.id,
            transactionID: transactionId,
            studentID: studentId,
            courseID: courseId,
            amount: finalAmount,
            originalAmount: course.price,
            discountAmount: discountAmount,
            couponCode: appliedCoupon,
            currency: 'INR',
            paymentMethod: 'Card', // Will be updated after payment
            status: 'initiated',
            receiptId: receiptId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        await payment.save();

        res.status(200).json({
            success: true,
            orderId: orderResult.order.id,
            amount: orderResult.order.amount,
            currency: orderResult.order.currency,
            key: orderResult.key_id,
            transactionId: transactionId,
            course: {
                id: course._id,
                title: course.title,
                price: course.price,
                finalPrice: finalAmount
            },
            coupon: appliedCoupon ? {
                code: appliedCoupon,
                discountAmount: discountAmount,
                originalAmount: course.price
            } : null,
            user: {
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });

    } catch (err) {
        console.error('Payment initialization error:', err);
        res.status(500).json({ message: 'Payment initialization failed', error: err.message });
    }
};

/**
 * Verify Payment and Complete Enrollment
 * POST /api/payments/verify
 */
exports.verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            transaction_id 
        } = req.body;

        // Find payment record
        const payment = await Payment.findOne({ transactionID: transaction_id })
            .populate('studentID')
            .populate('courseID');

        if (!payment) {
            return res.status(404).json({ message: 'Payment record not found' });
        }

        // Verify payment signature
        const verificationResult = razorpayService.verifyPayment(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!verificationResult.success || !verificationResult.verified) {
            // Mark payment as failed
            payment.status = 'failed';
            payment.failureReason = verificationResult.error || 'Signature verification failed';
            await payment.save();

            return res.status(400).json({ 
                message: 'Payment verification failed',
                verified: false 
            });
        }

        // Get payment details from Razorpay
        const paymentDetails = await razorpayService.getPaymentDetails(razorpay_payment_id);
        
        if (paymentDetails.success) {
            const razorpayPayment = paymentDetails.payment;
            
            // Update payment record with success details
            payment.razorpayPaymentId = razorpay_payment_id;
            payment.razorpaySignature = razorpay_signature;
            payment.status = 'completed';
            payment.completedAt = new Date();
            payment.paymentMethod = getPaymentMethodFromRazorpay(razorpayPayment.method);
            
            await payment.save();

            // Create enrollment
            const enrollment = new Enrollment({
                studentID: payment.studentID._id,
                courseID: payment.courseID._id,
                enrolledAt: new Date(),
                status: 'Active',
                progress: 0,
                completed: false
            });

            await enrollment.save();

            // Update user's enrolled courses
            await User.findByIdAndUpdate(payment.studentID._id, {
                $addToSet: { enrolledCourses: payment.courseID._id }
            });

            // Send payment confirmation email
            try {
                await emailService.sendPaymentConfirmationEmail(
                    payment.studentID.email,
                    {
                        studentName: payment.studentID.name || 'Student',
                        studentId: payment.studentID.studentID || 'N/A',
                        courseName: payment.courseID?.title || 'Course',
                        amount: payment.amount,
                        transactionId: payment.transactionID,
                        paymentId: razorpay_payment_id,
                        paymentMethod: payment.paymentMethod,
                        date: new Date()
                    }
                );
                payment.emailSent = true;
                await payment.save();
            } catch (emailError) {
                console.error('Failed to send confirmation email:', emailError);
                // Don't fail the payment for email issues
            }

            res.status(200).json({
                success: true,
                verified: true,
                message: 'Payment successful! Enrollment completed.',
                enrollment: enrollment,
                payment: {
                    transactionId: payment.transactionID,
                    amount: payment.amount,
                    status: payment.status,
                    paymentMethod: payment.paymentMethod
                }
            });

        } else {
            payment.status = 'failed';
            payment.failureReason = 'Failed to fetch payment details from Razorpay';
            await payment.save();

            res.status(500).json({ 
                message: 'Failed to verify payment details',
                verified: false 
            });
        }

    } catch (err) {
        console.error('Payment verification error:', err);
        res.status(500).json({ message: 'Payment verification failed', error: err.message });
    }
};

/**
 * Handle Payment Failure
 * POST /api/payments/failure
 */
exports.handlePaymentFailure = async (req, res) => {
    try {
        const { transaction_id, error } = req.body;

        const payment = await Payment.findOne({ transactionID: transaction_id })
            .populate('studentID')
            .populate('courseID');

        if (payment) {
            payment.status = 'failed';
            payment.failureReason = error?.description || 'Payment failed';
            await payment.save();

            // Send failure notification email
            try {
                await emailService.sendPaymentFailureEmail(
                    payment.studentID.email,
                    {
                        studentName: payment.studentID.name || 'Student',
                        courseName: payment.courseID?.title || 'Course',
                        amount: payment.amount,
                        transactionId: payment.transactionID,
                        failureReason: payment.failureReason,
                        date: new Date()
                    }
                );
            } catch (emailError) {
                console.error('Failed to send failure email:', emailError);
            }
        }

        res.status(200).json({ 
            message: 'Payment failure recorded',
            success: false 
        });

    } catch (err) {
        console.error('Payment failure handling error:', err);
        res.status(500).json({ message: 'Failed to handle payment failure', error: err.message });
    }
};

/**
 * Get User's Payment History
 * GET /api/payments/my
 */
exports.getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ studentID: req.user.id })
            .populate('courseID', 'title thumbnail category')
            .sort({ date: -1 });

        res.status(200).json(payments);
    } catch (err) {
        console.error('Fetch payments error:', err);
        res.status(500).json({ message: 'Failed to fetch payments', error: err.message });
    }
};

/**
 * Get Payment Details by Transaction ID
 * GET /api/payments/:transactionId
 */
exports.getPaymentDetails = async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const payment = await Payment.findOne({ 
            transactionID: transactionId,
            studentID: req.user.id 
        })
        .populate('courseID', 'title thumbnail category')
        .populate('studentID', 'name email studentID');

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.status(200).json(payment);
    } catch (err) {
        console.error('Get payment details error:', err);
        res.status(500).json({ message: 'Failed to fetch payment details', error: err.message });
    }
};

// Legacy method for backwards compatibility
exports.processPayment = async (req, res) => {
    res.status(400).json({ 
        message: 'This endpoint is deprecated. Please use /initialize and /verify endpoints.' 
    });
};

// Legacy method for backwards compatibility
exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const { Coupon } = require('../models/index');
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });

        if (!coupon) {
            return res.status(404).json({ message: 'Invalid or expired coupon code.' });
        }

        if (coupon.expiryDate && new Date() > coupon.expiryDate) {
            return res.status(400).json({ message: 'This coupon has expired.' });
        }

        res.status(200).json({
            message: 'Coupon applied successfully!',
            discountPercent: coupon.discountPercent
        });
    } catch (err) {
        res.status(500).json({ message: 'Coupon validation failed' });
    }
};

/**
 * Helper Functions
 */

// Calculate profile completion percentage
function calculateProfileCompletion(user) {
    if (!user) return 0;

    const requiredFields = [
        'name', 'email', 'phone', 'dob', 'gender',
        'address.doorNumber', 'address.streetName', 'address.town',
        'address.district', 'address.pincode', 'address.state'
    ];

    let completedFields = 0;
    requiredFields.forEach(field => {
        const value = field.includes('.') ? 
            field.split('.').reduce((obj, key) => obj?.[key], user) : 
            user[field];
        
        if (value && value.toString().trim() !== '') {
            completedFields++;
        }
    });

    return Math.round((completedFields / requiredFields.length) * 100);
}

// Map Razorpay payment methods to our internal format
function getPaymentMethodFromRazorpay(method) {
    const methodMap = {
        'card': 'Card',
        'netbanking': 'NetBanking',
        'upi': 'UPI',
        'wallet': 'Wallet'
    };
    
    return methodMap[method] || 'Card';
}
