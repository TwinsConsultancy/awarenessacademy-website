const { Progress, Course, Module } = require('../models/index');

// Update Module Progress (Time-based)
exports.updateProgress = async (req, res) => {
    try {
        const { courseID, moduleID, timeSpent } = req.body;
        const studentID = req.user.id;

        // Validation
        if (!courseID || !moduleID) {
            return res.status(400).json({ message: 'Course ID and Module ID are required' });
        }

        // Get Module details for duration
        const module = await Module.findById(moduleID);
        if (!module) return res.status(404).json({ message: 'Module not found' });

        // Get or Create Progress
        let progress = await Progress.findOne({ studentID, courseID });
        if (!progress) {
            progress = new Progress({
                studentID,
                courseID,
                completedModules: [],
                moduleProgress: []
            });
        }

        // Find existing module progress
        let modProgress = progress.moduleProgress.find(m => m.moduleID.toString() === moduleID);

        if (!modProgress) {
            // New interaction
            progress.moduleProgress.push({
                moduleID,
                timeSpent: timeSpent || 0,
                completed: false
            });
            modProgress = progress.moduleProgress[progress.moduleProgress.length - 1];
        } else {
            // Update time spent
            if (timeSpent) {
                modProgress.timeSpent += timeSpent; // Accumulate time
            }
            modProgress.lastUpdated = new Date();
        }

        // Check Completion Rule: > 50% of duration
        const requiredSeconds = (module.duration || 10) * 60 * 0.5; // 50% of duration (minutes to seconds)

        const wasCompleted = modProgress.completed;
        let newlyCompleted = false;

        if (!modProgress.completed && modProgress.timeSpent >= requiredSeconds) {
            modProgress.completed = true;
            newlyCompleted = true;

            // Sync with legacy completedModules array
            // Robust check using string comparison to avoid ObjectId/String mismatches
            const alreadyRecorded = progress.completedModules.some(id => id.toString() === moduleID.toString());
            if (!alreadyRecorded) {
                progress.completedModules.push(moduleID);
            }
        }

        // Recalculate Course Percentage
        const totalModules = await Module.countDocuments({ courseId: courseID, status: 'Approved' });
        if (totalModules > 0) {
            // Count completed based on legacy array or new structure (synced above)
            progress.percentComplete = Math.round((progress.completedModules.length / totalModules) * 100);
        }

        progress.lastAccessed = new Date();
        await progress.save();

        res.status(200).json({
            message: 'Progress updated',
            moduleCompleted: newlyCompleted,
            percentComplete: progress.percentComplete,
            nextModuleID: null // TODO: Implement next module logic if needed
        });

    } catch (err) {
        console.error('Progress update error:', err);
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
        res.status(200).json(progress || { percentComplete: 0, completedModules: [] });
    } catch (err) {
        res.status(500).json({ message: 'Fetch progress failed', error: err.message });
    }
};
