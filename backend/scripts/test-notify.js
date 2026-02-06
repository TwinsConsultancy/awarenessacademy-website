
const mongoose = require('mongoose');
const { Course, CourseSubscriber } = require('../models');
require('dotenv').config({ path: '../.env' });

// Mock Email Service
const emailService = {
    sendCoursePublishedNotification: async (data) => {
        console.log(`[MOCK EMAIL] To: ${data.subscriberEmail}, Subject: Now Available`);
        return true;
    }
};

const MONGODB_URL = process.env.MONGODB_URL;

async function runTest() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(MONGODB_URL);
        console.log('Connected.');

        // 1. Create Test Course (Pending)
        console.log('Creating Test Course...');
        const course = await Course.create({
            title: 'Test Notification Course',
            description: 'Test Desc',
            category: 'Test',
            price: 100,
            difficulty: 'Beginner',
            duration: '1h',
            status: 'Pending', // Current status
            mentors: []
        });
        console.log(`Course created: ${course._id} (Status: ${course.status})`);

        // 2. Subscribe User
        console.log('Subscribing user...');
        const sub = await CourseSubscriber.create({
            courseID: course._id,
            name: 'Test User',
            email: 'testsub@example.com',
            phone: '1234567890'
        });
        console.log(`Subscriber created: ${sub.email} (Notified: ${sub.notified})`);

        // 3. Simulate Update to Published
        console.log('--- Simulating Update to Published ---');

        const id = course._id;
        const updates = { status: 'Published' };

        // Logic from courseController.js
        const oldCourse = await Course.findById(id); // Should be Pending

        console.log(`[Logic] Old Status: ${oldCourse.status}`);
        console.log(`[Logic] New Status: ${updates.status}`);

        let notificationSent = false;

        if (oldCourse.status !== 'Published' && updates.status === 'Published') {
            console.log(`[Logic] Condition Passed! Finding subscribers...`);

            const subscribers = await CourseSubscriber.find({
                courseID: id,
                notified: false
            });
            console.log(`[Logic] Found ${subscribers.length} subscribers`);

            if (subscribers.length > 0) {
                for (const subscriber of subscribers) {
                    await emailService.sendCoursePublishedNotification({
                        subscriberEmail: subscriber.email
                    });
                    subscriber.notified = true;
                    await subscriber.save();
                    console.log(`[Logic] Marked as notified.`);
                    notificationSent = true;
                }
            }
        } else {
            console.log('[Logic] Condition FAILED.');
        }

        // Cleanup
        await Course.findByIdAndDelete(course._id);
        await CourseSubscriber.deleteMany({ email: 'testsub@example.com' });
        console.log('Cleanup done.');

        if (notificationSent) {
            console.log('✅ TEST PASSED: Notification logic triggered.');
        } else {
            console.log('❌ TEST FAILED: Notification logic NOT triggered.');
        }

    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
