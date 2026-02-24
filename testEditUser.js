const mongoose = require('mongoose');
const { User } = require('./backend/models');
const adminController = require('./backend/controllers/adminController');
require('dotenv').config({ path: './backend/.env' });

async function run() {
    await mongoose.connect(process.env.MONGODB_URL);

    const user = await User.findOne({});
    if (!user) {
        console.log("No user found");
        process.exit(0);
    }

    const mockReq = {
        params: { id: user._id.toString() },
        body: { name: user.name + ' Updated', role: user.role, reason: "Testing edit user" },
        user: { role: 'Admin' }
    };

    const mockRes = {
        status: function (s) {
            this.statusCode = s;
            return this;
        },
        json: function (data) {
            console.log("STATUS:", this.statusCode);
            console.log("DATA:", JSON.stringify(data, null, 2));
        }
    };

    await adminController.updateUser(mockReq, mockRes);
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
