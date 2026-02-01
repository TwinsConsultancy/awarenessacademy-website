const { Attendance, Course, User } = require('../models/index');

// Mark Attendance (Join Live)
exports.markAttendance = async (req, res) => {
    try {
        const { courseID, scheduleID } = req.body;
        const studentID = req.user.id;

        // Check if already marked
        const existing = await Attendance.findOne({ studentID, scheduleID });
        if (existing) return res.status(400).json({ message: 'Attendance already marked.' });

        const newRecord = new Attendance({
            studentID,
            courseID,
            scheduleID,
            status: 'Present'
        });

        await newRecord.save();
        res.status(200).json({ message: 'Attendance recorded. Welcome to the live session!' });

    } catch (err) {
        res.status(500).json({ message: 'Attendance failed', error: err.message });
    }
};

// Get Attendance History
exports.getMyAttendance = async (req, res) => {
    try {
        const records = await Attendance.find({ studentID: req.user.id }).populate('courseID', 'title');
        res.status(200).json(records);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed', error: err.message });
    }
};
