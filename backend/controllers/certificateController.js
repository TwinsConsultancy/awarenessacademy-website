const { Certificate, Course, User } = require('../models/index');

exports.getMyCertificates = async (req, res) => {
    try {
        const certs = await Certificate.find({ studentID: req.user.id }).populate('courseID', 'title');
        res.status(200).json(certs);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed', error: err.message });
    }
};

exports.getCertificateDetails = async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id)
            .populate('studentID', 'name studentID')
            .populate('courseID', 'title');

        if (!cert) return res.status(404).json({ message: 'Certificate not found' });

        res.status(200).json(cert);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed', error: err.message });
    }
};
