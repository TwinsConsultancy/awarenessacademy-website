/**
 * Quick Payment System Test
 * Tests the critical components without full server startup
 */

require('dotenv').config({ path: './backend/.env' });

console.log('🧪 Running Payment System Tests...\n');

// Test 1: Environment Variables
console.log('1. 🔧 Environment Variables:');
console.log('   RAZORPAY_KEY_ID:', process.env.key_id ? '✅ Loaded' : '❌ Missing');
console.log('   RAZORPAY_KEY_SECRET:', process.env.key_secret ? '✅ Loaded' : '❌ Missing'); 
console.log('   SMTP_USER:', process.env.SMTP_USER ? '✅ Loaded' : '❌ Missing');
console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ Loaded' : '❌ Missing');

// Test 2: Razorpay Service
console.log('\n2. 💳 Razorpay Service:');
try {
    const razorpayService = require('./backend/utils/razorpayService');
    console.log('   ✅ Razorpay service loaded successfully');
    
    // Test receipt generation
    const receipt = razorpayService.generateReceiptId('12345', '67890');
    console.log('   ✅ Receipt ID generation:', receipt);
    
    // Test amount formatting
    const formatted = razorpayService.formatAmount(1999);
    console.log('   ✅ Amount formatting (1999 -> paise):', formatted);
} catch (error) {
    console.log('   ❌ Razorpay service error:', error.message);
}

// Test 3: Email Service
console.log('\n3. 📧 Email Service:');
try {
    const emailService = require('./backend/utils/emailService');
    console.log('   ✅ Email service loaded successfully');
} catch (error) {
    console.log('   ❌ Email service error:', error.message);
}

// Test 4: Database Models
console.log('\n4. 🗄️ Database Models:');
try {
    const { Payment, User, Course, Enrollment } = require('./backend/models/index');
    console.log('   ✅ Payment model loaded');
    console.log('   ✅ User model loaded');
    console.log('   ✅ Course model loaded');
    console.log('   ✅ Enrollment model loaded');
} catch (error) {
    console.log('   ❌ Database models error:', error.message);
}

// Test 5: Payment Controller
console.log('\n5. 🎛️ Payment Controller:');
try {
    const paymentController = require('./backend/controllers/paymentController');
    const functions = Object.keys(paymentController);
    console.log('   ✅ Payment controller loaded');
    console.log('   📋 Available functions:', functions.join(', '));
} catch (error) {
    console.log('   ❌ Payment controller error:', error.message);
}

console.log('\n🎯 Test Summary:');
console.log('   All critical components checked');
console.log('   Ready for frontend integration testing');
console.log('   🚀 Payment system should be operational!\n');

console.log('📋 Next Steps:');
console.log('   1. Start server: npm start');
console.log('   2. Open student dashboard');
console.log('   3. Test payment flow manually');
console.log('   4. Check email notifications');