const { Course, Content, Impression, User } = require('../models/index');

// Get Enrolled Courses for Student
exports.getEnrolledCourses = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: 'enrolledCourses',
            populate: { path: 'mentorID', select: 'name' }
        });
        res.status(200).json(user.enrolledCourses);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed', error: err.message });
    }
};

// Get Public Marketplace Courses
exports.getMarketplace = async (req, res) => {
    try {
        const courses = await Course.find({ status: 'Published' })
            .populate('mentorID', 'name');
        res.status(200).json(courses);
    } catch (err) {
        res.status(500).json({ message: 'Marketplace load failed', error: err.message });
    }
};

// Get Course Preview Data (Public)
exports.getCoursePreview = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await Course.findById(id).populate('mentorID', 'name');

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Fetch only content with previewDuration > 0
        const previewContent = await Content.find({
            courseID: id,
            approvalStatus: 'Approved',
            previewDuration: { $gt: 0 }
        }).select('title type fileUrl previewDuration'); // Only necessary fields

        res.status(200).json({
            course: {
                title: course.title,
                description: course.description,
                mentor: course.mentorID.name,
                price: course.price,
                thumbnail: course.thumbnail
            },
            previews: previewContent
        });
    } catch (err) {
        console.error('Preview error:', err);
        res.status(500).json({ message: 'Failed to load specific preview', error: err.message });
    }
};

// Get Course Details & Content
exports.getCourseDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { Course, Content, User, Enrollment } = require('../models/index');
        const course = await Course.findById(id).populate('mentorID', 'name');
        const content = await Content.find({ courseID: id, approvalStatus: 'Approved' });

        // Logic to check if user has access (purchased and not expired)
        let hasFullAccess = false;
        let isExpired = false;

        if (req.user) {
            const user = await User.findById(req.user.id);
            const enrollment = await Enrollment.findOne({ studentID: req.user.id, courseID: id });

            if (user.role === 'Admin') {
                hasFullAccess = true;
            } else if (enrollment) {
                if (new Date() > enrollment.expiryDate) {
                    isExpired = true;
                    hasFullAccess = false;
                } else {
                    hasFullAccess = true;
                }
            }
        }

        res.status(200).json({ course, content, hasFullAccess, isExpired });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch details', error: err.message });
    }
};

// Track Impression (Play Event)
exports.trackImpression = async (req, res) => {
    try {
        const { courseID, videoID, watchDuration, totalDuration } = req.body;

        const impression = new Impression({
            courseID,
            videoID,
            viewerType: req.user ? 'Registered Student' : 'Unknown',
            viewerIdentity: req.user ? req.user.id : (req.ip || 'Unknown-IP'),
            watchDuration,
            totalVideoDuration: totalDuration,
            ipAddress: req.ip
        });

        await impression.save();
        res.status(200).json({ message: 'Impression recorded' });
    } catch (err) {
        res.status(500).json({ message: 'Tracking failed', error: err.message });
    }
};
