/**
 * InnerSpark Payment Integration with Razorpay
 * Handles payment processing for course enrollments
 */

class PaymentManager {
    constructor() {
        this.razorpayLoaded = false;
        this.fallbackMode = false;
        this.currentPayment = null;
        this.loadRazorpay();
    }

    /**
     * Load Razorpay checkout script
     */
    async loadRazorpay() {
        if (window.Razorpay) {
            this.razorpayLoaded = true;
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => {
                this.razorpayLoaded = true;
                resolve();
            };
            script.onerror = () => {
                // Silently handle Razorpay loading failure
                this.razorpayLoaded = false;
                this.fallbackMode = true;
                resolve(); // Resolve instead of reject to prevent unhandled errors
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize payment process
     */
    async initializePayment(courseId, amount, courseTitle) {
        try {
            if (!this.razorpayLoaded) {
                await this.loadRazorpay();
            }

            // Check if Razorpay failed to load and use fallback
            if (this.fallbackMode) {
                this.showPaymentFallback(courseId, courseTitle);
                return;
            }

            UI.showLoader('Preparing payment...');
            
            // Initialize payment on backend
            const response = await fetch(`${Auth.apiBase}/payments/initialize`, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ courseId })
            });

            const data = await response.json();

            if (!response.ok) {
                // Provide specific error messages for common issues
                let errorMessage = data.message || 'Failed to initialize payment';
                
                if (response.status === 400) {
                    if (data.message?.includes('profile')) {
                        errorMessage = 'Please complete your profile before enrolling in courses';
                    } else if (data.message?.includes('amount')) {
                        errorMessage = 'Invalid payment amount. Please try again';
                    } else if (data.message?.includes('currency')) {
                        errorMessage = 'Currency configuration error. Please contact support';
                    }
                }
                
                throw new Error(errorMessage);
            }

            console.log('✅ Payment initialized:', {
                orderId: data.orderId,
                amount: `₹${data.amount / 100}`,
                currency: data.currency
            });

            this.currentPayment = data;

            // Launch Razorpay checkout
            await this.launchCheckout(data, courseTitle);

        } catch (error) {
            console.error('Payment initialization error:', error);
            UI.error(error.message || 'Failed to initialize payment');
        } finally {
            UI.hideLoader();
        }
    }

    async launchCheckout(paymentData, courseTitle) {
        // Validate payment data
        if (!paymentData.orderId || !paymentData.amount || !paymentData.key) {
            throw new Error('Invalid payment data received');
        }

        // Ensure currency is INR
        if (paymentData.currency !== 'INR') {
            throw new Error('Invalid currency. Only INR is supported');
        }

        console.log('🚀 Launching Razorpay checkout:', {
            orderId: paymentData.orderId,
            amount: `₹${paymentData.amount / 100}`,
            currency: paymentData.currency
        });

        const options = {
            key: paymentData.key,
            amount: paymentData.amount,
            currency: paymentData.currency,
            name: 'InnerSpark Academy',
            description: `Enrollment for ${courseTitle}`,
            // Removed image to fix CORS issue with localhost
            order_id: paymentData.orderId,
            
            // Custom styling to match website theme (Orange+Yellow)
            theme: {
                color: '#FF9933', // Website's saffron orange color
                backdrop_color: 'rgba(255, 153, 51, 0.1)'
            },
            
            // Modal styling
            modal: {
                ondismiss: () => {
                    console.log('Payment modal closed by user');
                    this.handlePaymentFailure('Payment cancelled by user');
                },
                animation: true,
                backdrop_close: false,
                confirm_close: true,
                escape: false
            },

            // Prefilled customer details
            prefill: {
                name: paymentData.user.name,
                email: paymentData.user.email,
                contact: paymentData.user.phone || ''
            },

            // Notes for internal tracking
            notes: {
                course_id: paymentData.course.id,
                student_name: paymentData.user.name,
                transaction_id: paymentData.transactionId,
                enrollment_type: 'course_purchase'
            },

            // Success handler
            handler: (response) => {
                console.log('✅ Payment successful:', response.razorpay_payment_id);
                this.handlePaymentSuccess(response);
            },

            // Enable UPI QR Code and other payment methods
            method: {
                upi: {
                    flow: "collect", // Enables UPI QR code display
                    types: ["collect", "intent"],
                    description: "Pay using UPI QR Code or UPI ID"
                },
                card: {
                    name: "Cards",
                    description: "Credit/Debit Cards"
                },
                netbanking: {
                    name: "Net Banking", 
                    description: "All Banks"
                },
                wallet: {
                    name: "Wallets",
                    description: "PayTM, PhonePe, etc."
                },
                paylater: true,
                emi: true
            },

            // Retry options for failed payments
            retry: {
                enabled: true,
                max_count: 3
            },

            // Timeout settings
            timeout: 300, // 5 minutes

            // Remember customer preferences
            remember_customer: true,

            // Enable UPI QR Code specifically
            config: {
                display: {
                    blocks: {
                        utib: { // UPI block
                            name: "Pay using UPI",
                            instruments: [
                                {
                                    method: "upi",
                                    flows: ["collect", "intent"],
                                    apps: ["google_pay", "phonepe", "paytm", "bhim"]
                                }
                            ]
                        }
                    },
                    sequence: ["block.utib", "block.card", "block.netbanking"]
                }
            }
        };

        // Create and open Razorpay checkout
        const razorpay = new Razorpay(options);
        
        // Handle payment failure
        razorpay.on('payment.failed', (response) => {
            this.handlePaymentFailure(response.error.description, response);
        });

        // Open checkout modal
        razorpay.open();
    }

    /**
     * Handle successful payment
     */
    async handlePaymentSuccess(response) {
        try {
            UI.showLoader('Verifying payment...');
            
            // Verify payment on backend
            const verificationResponse = await fetch(`${Auth.apiBase}/payments/verify`, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    transaction_id: this.currentPayment.transactionId
                })
            });

            const verificationData = await verificationResponse.json();

            if (!verificationResponse.ok || !verificationData.verified) {
                throw new Error(verificationData.message || 'Payment verification failed');
            }

            // Show success message
            this.showPaymentSuccessModal(verificationData);

            // Refresh enrolled courses
            if (typeof loadEnrolledCourses === 'function') {
                await loadEnrolledCourses();
            }

            // Refresh marketplace
            if (typeof loadMarketplace === 'function') {
                loadMarketplace();
            }

            // Navigate to course section after delay
            setTimeout(() => {
                if (typeof switchSection === 'function') {
                    switchSection('course');
                }
            }, 3000);

        } catch (error) {
            console.error('Payment verification error:', error);
            this.showPaymentErrorModal(error.message || 'Payment verification failed');
        } finally {
            UI.hideLoader();
        }
    }

    /**
     * Handle payment failure
     */
    async handlePaymentFailure(errorMessage, errorResponse = null) {
        try {
            // Notify backend about failure
            await fetch(`${Auth.apiBase}/payments/failure`, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({
                    transaction_id: this.currentPayment?.transactionId,
                    error: {
                        description: errorMessage,
                        code: errorResponse?.error?.code,
                        source: errorResponse?.error?.source,
                        step: errorResponse?.error?.step,
                        reason: errorResponse?.error?.reason
                    }
                })
            });
        } catch (error) {
            console.error('Failed to notify backend about payment failure:', error);
        }

        this.showPaymentErrorModal(errorMessage);
    }

    /**
     * Show payment success modal with InnerSpark theme
     */
    showPaymentSuccessModal(paymentData) {
        const modal = document.createElement('div');
        modal.className = 'payment-modal-overlay';
        modal.innerHTML = `
            <div class="payment-modal success-modal">
                <div class="payment-modal-header">
                    <div class="success-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h2>Payment Successful!</h2>
                    <p>Your enrollment has been confirmed</p>
                </div>
                
                <div class="payment-modal-body">
                    <div class="payment-details">
                        <h3>Payment Details</h3>
                        <div class="detail-row">
                            <span>Transaction ID:</span>
                            <span class="transaction-id">${paymentData.payment.transactionId}</span>
                        </div>
                        <div class="detail-row">
                            <span>Amount Paid:</span>
                            <span class="amount">₹${paymentData.payment.amount}</span>
                        </div>
                        <div class="detail-row">
                            <span>Payment Method:</span>
                            <span>${paymentData.payment.paymentMethod}</span>
                        </div>
                        <div class="detail-row">
                            <span>Status:</span>
                            <span class="status success">Completed</span>
                        </div>
                    </div>
                    
                    <div class="enrollment-info">
                        <p><i class="fas fa-graduation-cap"></i> You can now access your course from the dashboard</p>
                        <p><i class="fas fa-envelope"></i> A confirmation email has been sent to your registered email address</p>
                    </div>
                </div>
                
                <div class="payment-modal-footer">
                    <button class="btn-primary" onclick="this.closest('.payment-modal-overlay').remove(); switchSection('course');">
                        <i class="fas fa-play"></i> Start Learning
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Auto remove after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 10000);
    }

    /**
     * Show payment error modal with InnerSpark theme
     */
    showPaymentErrorModal(errorMessage) {
        const modal = document.createElement('div');
        modal.className = 'payment-modal-overlay';
        modal.innerHTML = `
            <div class="payment-modal error-modal">
                <div class="payment-modal-header error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2>Payment Failed</h2>
                    <p>There was an issue processing your payment</p>
                </div>
                
                <div class="payment-modal-body">
                    <div class="error-details">
                        <p><strong>Error:</strong> ${errorMessage}</p>
                    </div>
                    
                    <div class="help-info">
                        <h4>What to do next:</h4>
                        <ul>
                            <li>Check your card details and try again</li>
                            <li>Ensure sufficient balance in your account</li>
                            <li>Contact your bank if the issue persists</li>
                            <li>Try a different payment method</li>
                        </ul>
                    </div>
                </div>
                
                <div class="payment-modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.payment-modal-overlay').remove();">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="btn-primary" onclick="this.closest('.payment-modal-overlay').remove(); /* Retry payment logic can be added here */">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Check payment status
     */
    async checkPaymentStatus(transactionId) {
        try {
            const response = await fetch(`${Auth.apiBase}/payments/${transactionId}`, {
                headers: Auth.getHeaders()
            });

            const paymentData = await response.json();

            if (response.ok) {
                return {
                    success: true,
                    payment: paymentData
                };
            } else {
                return {
                    success: false,
                    error: paymentData.message
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Show payment fallback when Razorpay fails to load
     */
    showPaymentFallback(courseId, courseTitle) {
        UI.hideLoader();
        
        // Create user-friendly fallback modal
        const modal = UI.createPopup({
            title: 'Payment Service Unavailable',
            message: `Sorry, our payment system is temporarily unavailable. You can still enroll in "${courseTitle}" using alternative methods.`,
            type: 'info',
            icon: 'credit-card',
            confirmText: 'Contact Support',
            cancelText: 'Try Later',
            onConfirm: () => {
                // Open support contact or redirect to contact page
                if (typeof switchSection !== 'undefined') {
                    switchSection('tickets');
                } else {
                    window.location.href = 'contact.html';
                }
            },
            onCancel: () => {
                // Do nothing, just close modal
            }
        });

        // Also show notification
        UI.showNotification('Payment service temporarily unavailable. Please contact support for enrollment assistance.', 'warning');
    }
}

// CSS Styles for payment modals
const paymentStyles = `
<style>
.payment-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
}

.payment-modal {
    background: white;
    border-radius: 15px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
}

.payment-modal-header {
    text-align: center;
    padding: 30px 20px 20px;
    background: linear-gradient(135deg, var(--color-primary), var(--color-golden));
    color: white;
    border-radius: 15px 15px 0 0;
}

.payment-modal-header.error {
    background: linear-gradient(135deg, #ff6b6b, #ffa8a8);
}

.success-icon, .error-icon {
    font-size: 4rem;
    margin-bottom: 15px;
    opacity: 0.9;
}

.payment-modal-header h2 {
    margin: 0 0 10px;
    font-size: 1.5rem;
    font-weight: 600;
}

.payment-modal-header p {
    margin: 0;
    opacity: 0.9;
    font-size: 1rem;
}

.payment-modal-body {
    padding: 25px;
}

.payment-details {
    background: var(--color-bg-light);
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 20px;
}

.payment-details h3 {
    margin: 0 0 20px;
    color: var(--color-primary);
    font-size: 1.2rem;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #eee;
}

.detail-row:last-child {
    border-bottom: none;
}

.detail-row span:first-child {
    font-weight: 600;
    color: var(--color-text-secondary);
}

.detail-row span:last-child {
    font-weight: 700;
    color: var(--color-text-primary);
}

.transaction-id {
    font-family: 'Courier New', monospace !important;
    background: #f8f9fa;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.9rem !important;
}

.amount {
    color: var(--color-success) !important;
    font-size: 1.1rem !important;
}

.status.success {
    color: var(--color-success) !important;
}

.enrollment-info {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(255, 215, 0, 0.1));
    padding: 20px;
    border-radius: 10px;
    border-left: 4px solid var(--color-primary);
}

.enrollment-info p {
    margin: 10px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.enrollment-info i {
    color: var(--color-primary);
    width: 20px;
}

.error-details {
    background: #ffe6e6;
    padding: 15px;
    border-radius: 8px;
    border-left: 4px solid #ff6b6b;
    margin-bottom: 20px;
}

.help-info {
    background: #e3f2fd;
    padding: 20px;
    border-radius: 8px;
    border-left: 4px solid #2196f3;
}

.help-info h4 {
    margin: 0 0 15px;
    color: #0d47a1;
}

.help-info ul {
    margin: 0;
    padding-left: 20px;
}

.help-info li {
    margin: 8px 0;
    color: #1565c0;
}

.payment-modal-footer {
    padding: 20px 25px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 15px;
    justify-content: flex-end;
}

.payment-modal-footer button {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-primary {
    background: linear-gradient(135deg, var(--color-primary), var(--color-golden));
    color: white;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-secondary:hover {
    background: #5a6268;
    transform: translateY(-2px);
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { 
        opacity: 0;
        transform: translateY(30px) scale(0.9);
    }
    to { 
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@media (max-width: 768px) {
    .payment-modal {
        width: 95%;
        margin: 20px;
    }
    
    .payment-modal-footer {
        flex-direction: column;
    }
    
    .payment-modal-footer button {
        width: 100%;
        justify-content: center;
    }
}
</style>
`;

// Inject styles into the page
if (!document.getElementById('payment-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'payment-styles';
    styleElement.innerHTML = paymentStyles;
    document.head.appendChild(styleElement);
}

// Create global payment manager instance
window.PaymentManager = new PaymentManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentManager;
}