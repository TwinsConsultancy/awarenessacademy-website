const mongoose = require('mongoose');
const { Payment, Enrollment, Course } = require('./backend/models');

require('dotenv').config({ path: './backend/.env' });

async function run() {
    await mongoose.connect(process.env.MONGODB_URL);

    const payments = await Payment.find({});
    console.log("Payments: ", payments.length);
    console.log("Payment Statuses: ", new Set(payments.map(t => t.status)));

    const enrollments = await Enrollment.find({});
    console.log("Enrollments: ", enrollments.length);

    if (enrollments.length > 0) {
        console.log("Enrollment keys: ", Object.keys(enrollments[0].toObject()));
    }

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
