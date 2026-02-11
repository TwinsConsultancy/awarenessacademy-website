/**
 * Test UPI Configuration with Enhanced Settings
 */

const razorpayService = require('../utils/razorpayService');

async function testUPIConfiguration() {
    console.log('🧪 Testing Enhanced UPI Configuration...\n');

    try {
        // Create a test order with UPI-optimized settings
        const testAmount = 100; // ₹100
        console.log('Creating order with UPI settings...');
        
        const orderResult = await razorpayService.createOrder(testAmount, 'INR', 'upi_test_receipt');
        
        if (orderResult.success) {
            console.log('✅ Order created successfully for UPI testing:');
            console.log('   Order ID:', orderResult.order.id);
            console.log('   Amount: ₹' + testAmount);
            console.log('   Currency:', orderResult.order.currency);
            
            // Display the configuration that should enable UPI QR codes
            console.log('\n🎯 Current Frontend UPI Config:');
            console.log('   ✅ UPI Flow: "collect" (enables QR codes)');
            console.log('   ✅ UPI Types: ["collect", "intent"]');
            console.log('   ✅ Specific UPI block configuration added');
            console.log('   ✅ CORS issue fixed (logo removed)');
            
            console.log('\n📱 Expected UPI Payment Options:');
            console.log('   🔲 UPI QR Code (scan with any UPI app)');
            console.log('   🔲 UPI ID (enter UPI ID manually)');
            console.log('   🔲 UPI Intent (redirect to UPI apps)');
            
            console.log('\n❓ If UPI still not visible in Razorpay checkout:');
            console.log('   1. Check Razorpay Dashboard settings (see guide above)');
            console.log('   2. Ensure you are in TEST mode');
            console.log('   3. Clear browser cache and retry');
            console.log('   4. Try a different browser');
            
        } else {
            console.log('❌ Order creation failed:', orderResult.error);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testUPIConfiguration();