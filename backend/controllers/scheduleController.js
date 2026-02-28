const { Schedule, Course } = require('../models/index');

// Create a Schedule (Staff)
exports.createSchedule = async (req, res) => {
    try {
        const { courseID, title, startTime, duration, meetingLink } = req.body;

        // Calculate endTime from startTime + duration (in minutes)
        const start = new Date(startTime);
        const end = new Date(start.getTime() + (duration || 60) * 60000); // Default 60 mins

        const newSchedule = new Schedule({
            courseID,
            staffID: req.user.id,
            title,
            startTime: start,
            endTime: end,
            expectedDuration: duration || 60,
            meetingLink,
            type: 'Live', // Default to Live for live class scheduling
            approvalStatus: 'Approved' // Auto-approve all live classes
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
        
        // Hide meeting link from students
        if (req.user.role === 'Student') {
            const sanitizedSchedules = schedules.map(schedule => {
                const scheduleObj = schedule.toObject();
                delete scheduleObj.meetingLink;
                return scheduleObj;
            });
            return res.status(200).json(sanitizedSchedules);
        }
        
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
            const myCourses = await Course.find({ mentors: req.user.id });
            courseIDs = myCourses.map(c => c._id);
        } else if (user.role === 'Admin') {
            const allCourses = await Course.find();
            courseIDs = allCourses.map(c => c._id);
        }

        const schedules = await Schedule.find({
            courseID: { $in: courseIDs }
        }).populate('courseID', 'title').populate('staffID', 'name').sort({ startTime: 1 });

        // Hide meeting link from students
        if (user.role === 'Student') {
            const sanitizedSchedules = schedules.map(schedule => {
                const scheduleObj = schedule.toObject();
                delete scheduleObj.meetingLink;
                return scheduleObj;
            });
            return res.status(200).json(sanitizedSchedules);
        }

        res.status(200).json(schedules);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch timetable', error: err.message });
    }
};

// Update Schedule Status (Admin Only)
exports.updateScheduleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'Approved', 'Rejected', etc.

        if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const schedule = await Schedule.findByIdAndUpdate(
            id,
            { approvalStatus: status },
            { new: true }
        );

        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        res.status(200).json({ message: `Schedule marked as ${status}`, schedule });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update schedule status', error: err.message });
    }
};

// Update Schedule (Admin Only)
exports.updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, startTime, duration, meetingLink } = req.body;

        const schedule = await Schedule.findById(id);
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        // Update fields
        if (title) schedule.title = title;
        if (startTime) {
            schedule.startTime = new Date(startTime);
            // Recalculate endTime if duration provided or use existing
            const durationToUse = duration || schedule.expectedDuration;
            schedule.endTime = new Date(schedule.startTime.getTime() + durationToUse * 60000);
        }
        if (duration) {
            schedule.expectedDuration = duration;
            // Recalculate endTime
            schedule.endTime = new Date(schedule.startTime.getTime() + duration * 60000);
        }
        if (meetingLink !== undefined) schedule.meetingLink = meetingLink;

        await schedule.save();
        res.status(200).json({ message: 'Schedule updated successfully', schedule });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update schedule', error: err.message });
    }
};

// Delete Schedule (Admin Only)
exports.deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Delete request received for schedule ID:', id);

        // Validate ObjectId format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log('Invalid ObjectId format:', id);
            return res.status(400).json({ message: 'Invalid schedule ID format' });
        }

        const schedule = await Schedule.findByIdAndDelete(id);
        console.log('Schedule found and deleted:', schedule ? 'Yes' : 'No');

        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        res.status(200).json({ message: 'Schedule deleted successfully' });
    } catch (err) {
        console.error('Delete schedule error:', err);
        res.status(500).json({ message: 'Failed to delete schedule', error: err.message });
    }
};
