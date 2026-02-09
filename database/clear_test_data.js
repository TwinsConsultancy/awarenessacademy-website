/**
 * Clear Test/Seeded Data from Database
 * Keeps only real production data
 */

const mongoose = require('mongoose');
const {
    User, Course, Payment, Enrollment, Schedule, Attendance,
    Progress, Result, Certificate, Content, Exam, Ticket,
    Forum, Broadcast, Banner, Blog, Event, Newsletter, Coupon, FAQ
} = require('../backend/models/index');

require('dotenv').config({ path: './backend/.env' });

const MONGO_URI = process.env.MONGODB_URL;

async function clearTestData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear seeded test data (keep Impressions as they're real user tracking)
        console.log('\n🧹 Clearing test data...');
        
        // Clear test users (keep admin@innerspark.com)
        const testEmails = [
            'swami@innerspark.com', 'maya@innerspark.com', 'ananda@innerspark.com',
            'arjun@example.com', 'priya@example.com', 'raj@example.com', 
            'ananya@example.com', 'vikram@example.com', 'sneha@example.com'
        ];
        
        const deletedUsers = await User.deleteMany({ email: { $in: testEmails } });
        console.log(`  ✓ Deleted ${deletedUsers.deletedCount} test users`);

        // Clear test payments (seeded ones)
        const deletedPayments = await Payment.deleteMany({ 
            transactionID: { $regex: /^TXN.*/ } // Seeded payments have this pattern
        });
        console.log(`  ✓ Deleted ${deletedPayments.deletedCount} test payments`);

        // Clear test enrollments
        const deletedEnrollments = await Enrollment.deleteMany({ 
            studentID: { $exists: true } 
        });
        console.log(`  ✓ Deleted ${deletedEnrollments.deletedCount} test enrollments`);

        // Clear test courses
        const deletedCourses = await Course.deleteMany({ 
            createdBy: { $exists: true }
        });
        console.log(`  ✓ Deleted ${deletedCourses.deletedCount} test courses`);

        // Clear other test data
        await Schedule.deleteMany({});
        await Attendance.deleteMany({});
        await Progress.deleteMany({});
        await Result.deleteMany({});
        await Certificate.deleteMany({});
        await Content.deleteMany({});
        await Exam.deleteMany({});
        await Ticket.deleteMany({});
        await Forum.deleteMany({});
        await Broadcast.deleteMany({});
        await Banner.deleteMany({});
        await Blog.deleteMany({});
        await Event.deleteMany({});
        await Newsletter.deleteMany({});
        await Coupon.deleteMany({});
        await FAQ.deleteMany({});

        console.log('\n✅ Test data cleared successfully!');
        console.log('📊 Real Impressions data has been preserved');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

clearTestData();
