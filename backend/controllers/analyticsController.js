const { Impression } = require('../models/index');

exports.trackImpression = async (req, res) => {
    try {
        const { courseID, type, metadata } = req.body;
        const studentID = req.user ? req.user.id : null;

        const impression = new Impression({
            courseID,
            studentID,
            type: type || 'View',
            metadata
        });
        await impression.save();
        res.status(201).json({ message: 'Metric recorded.' });
    } catch (err) {
        res.status(500).json({ message: 'Recording failed' });
    }
};
