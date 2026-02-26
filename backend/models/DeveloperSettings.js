const mongoose = require('mongoose');
const { Schema } = mongoose;

const developerSettingsSchema = new Schema({
    // Cost Monitoring Settings
    vpsPlan: { type: String, default: 'KVM 2' },
    vpsCost: { type: Number, default: 0 },
    vpsInstances: { type: Number, default: 1 },

    mongoPlan: { type: String, default: 'M0 Sandbox' },
    mongoCost: { type: Number, default: 0 },

    razorpayCommissionPercent: { type: Number, default: 2.0 },

    r2StoragePricePerGb: { type: Number, default: 0.015 },
    r2BandwidthPricePerGb: { type: Number, default: 0.09 },

    // Scaling & Load Control Settings
    autoScaleEnabled: { type: Boolean, default: false },
    maxInstancesAllowed: { type: Number, default: 3 },
    scalingThresholdPercent: { type: Number, default: 80 },

    // Track modifications
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DeveloperSettings', developerSettingsSchema);
