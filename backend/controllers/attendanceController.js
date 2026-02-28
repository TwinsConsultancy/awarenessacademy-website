const { Attendance, Course, User, Schedule } = require('../models/index');

// Mark Attendance (Join Live)
exports.markAttendance = async (req, res) => {
    try {
        const { courseID, scheduleID } = req.body;
        const studentID = req.user.id;

        // Check if already marked
        const existing = await Attendance.findOne({ studentID, scheduleID });
        if (existing) {
            // If already marked, still return the meeting link so they can rejoin
            const schedule = await Schedule.findById(scheduleID);
            return res.status(200).json({ 
                message: 'You have already joined this session.', 
                meetingLink: schedule?.meetingLink,
                alreadyJoined: true 
            });
        }

        const newRecord = new Attendance({
            studentID,
            courseID,
            scheduleID,
            status: 'Present'
        });

        await newRecord.save();
        
        // Get the meeting link from the schedule
        const schedule = await Schedule.findById(scheduleID);
        
        res.status(200).json({ 
            message: 'Attendance recorded. Welcome to the live session!', 
            meetingLink: schedule?.meetingLink 
        });

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
