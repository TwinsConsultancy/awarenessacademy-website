const mongoose = require('mongoose');
let Settings;
try {
    Settings = require('../models/Settings');
} catch (e) {
    console.error('Failed to import Settings model:', e);
}

// Initialize Settings if not exists
const initSettings = async () => {
    if (!Settings) {
        throw new Error('Settings model is not loaded');
    }

    // Ensure properly registered if import behaved oddly
    if (!Settings.findOne) {
        if (mongoose.models.Settings) {
            Settings = mongoose.models.Settings;
        } else {
            throw new Error('Settings model found but has no findOne');
        }
    }

    let settings = await Settings.findOne();
    if (!settings) {
        settings = new Settings();
        await settings.save();
    }
    return settings;
};

// Get Public Settings (Right Click, Maintenance Status)
exports.getPublicSettings = async (req, res) => {
    try {
        const settings = await initSettings();
        res.status(200).json({
            isMaintenanceMode: settings.isMaintenanceMode,
            maintenanceMessage: settings.maintenanceMessage,
            disableRightClick: settings.disableRightClick,
            siteTitle: settings.siteTitle
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch settings', error: err.message });
    }
};

// Get Admin Settings (All fields)
exports.getSettings = async (req, res) => {
    try {
        const settings = await initSettings();
        res.status(200).json(settings);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch settings', error: err.message });
    }
};

// Update Settings
exports.updateSettings = async (req, res) => {
    try {
        const updates = req.body;
        let settings = await Settings.findOne();

        if (!settings) settings = new Settings();

        Object.keys(updates).forEach(key => {
            if (settings[key] !== undefined) {
                settings[key] = updates[key];
            }
        });

        settings.lastUpdatedBy = req.user.id;
        settings.updatedAt = Date.now();

        await settings.save();
        res.status(200).json({ message: 'Settings updated', settings });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update settings', error: err.message });
    }
};
