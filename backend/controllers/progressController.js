const { Progress, Course, Content } = require('../models/index');

// Update Lesson Progress
exports.markLessonComplete = async (req, res) => {
    try {
        const { courseID, lessonID } = req.body;
        const studentID = req.user.id;

        let progress = await Progress.findOne({ studentID, courseID });
        if (!progress) {
            progress = new Progress({ studentID, courseID, completedLessons: [] });
        }

        if (!progress.completedLessons.includes(lessonID)) {
            progress.completedLessons.push(lessonID);

            // Calculate percentage
            const totalContent = await Content.countDocuments({ courseID, approvalStatus: 'Approved' });
            if (totalContent > 0) {
                progress.percentComplete = Math.round((progress.completedLessons.length / totalContent) * 100);
            }
        }

        progress.lastAccessed = new Date();
        await progress.save();

        res.status(200).json({ message: 'Lesson marked as complete', progress });
    } catch (err) {
        res.status(500).json({ message: 'Update progress failed', error: err.message });
    }
};

// Get Course Progress
exports.getCourseProgress = async (req, res) => {
    try {
        const progress = await Progress.findOne({
            studentID: req.user.id,
            courseID: req.params.courseID
        });
        res.status(200).json(progress || { percentComplete: 0, completedLessons: [] });
    } catch (err) {
        res.status(500).json({ message: 'Fetch progress failed', error: err.message });
    }
};
