const mongoose = require('mongoose');
const { Schema } = mongoose;

const settingsSchema = new Schema({
    isMaintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'System is currently under maintenance. Please check back later.' },
    disableRightClick: { type: Boolean, default: false },
    siteTitle: { type: String, default: 'InnerSpark' },
    supportEmail: { type: String, default: 'support@innerspark.com' },
    emailNotifications: { type: Boolean, default: true },
    strictVerification: { type: Boolean, default: false },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);
