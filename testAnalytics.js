const mongoose = require('mongoose');
const adminController = require('./backend/controllers/adminController');
const { User, Payment, Impression, Progress, Course, Enrollment, Schedule, Attendance, Module, Ticket } = require('./backend/models');

require('dotenv').config({ path: './backend/.env' });

async function run() {
    await mongoose.connect(process.env.MONGODB_URL);

    const mockReq = { query: { days: '30' } };
    const mockRes = {
        status: function (s) {
            this.statusCode = s;
            return this;
        },
        json: function (data) {
            console.log("STATUS:", this.statusCode);
            console.log("courseEnrollments:", data.courseEnrollments);
            console.log("revenueGrowth:", data.revenueGrowth);
            console.log("paymentStatus:", data.paymentStatus);
            console.log("revenueByCourse:", data.revenueByCourse);
        }
    };

    await adminController.getAdvancedAnalytics(mockReq, mockRes);
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
