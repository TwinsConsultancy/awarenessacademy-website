const { Schedule, Course } = require('../models/index');

// Create a Schedule (Staff)
exports.createSchedule = async (req, res) => {
    try {
        const { courseID, title, startTime, endTime, meetingLink, type } = req.body;

        const newSchedule = new Schedule({
            courseID,
            staffID: req.user.id,
            title,
            startTime,
            endTime,
            meetingLink,
            type
        });

        await newSchedule.save();
        res.status(201).json({ message: 'Schedule created successfully', schedule: newSchedule });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create schedule', error: err.message });
    }
};

// Get Schedules for a Course (Shared)
exports.getCourseSchedules = async (req, res) => {
    try {
        const schedules = await Schedule.find({ courseID: req.params.courseID }).sort({ startTime: 1 });
        res.status(200).json(schedules);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch schedules', error: err.message });
    }
};

// Get All Schedules for Student/Staff
exports.getMyTimetable = async (req, res) => {
    try {
        const { User, Course } = require('../models/index');
        const user = await User.findById(req.user.id);

        let courseIDs = [];
        if (user.role === 'Student') {
            courseIDs = user.enrolledCourses;
        } else if (user.role === 'Staff') {
            const myCourses = await Course.find({ mentorID: req.user.id });
            courseIDs = myCourses.map(c => c._id);
        } else if (user.role === 'Admin') {
            const allCourses = await Course.find();
            courseIDs = allCourses.map(c => c._id);
        }

        const schedules = await Schedule.find({
            courseID: { $in: courseIDs }
        }).populate('courseID', 'title').sort({ startTime: 1 });

        res.status(200).json(schedules);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch timetable', error: err.message });
    }
};
