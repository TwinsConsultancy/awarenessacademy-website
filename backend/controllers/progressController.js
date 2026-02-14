const { Progress, Course, Module } = require('../models/index');

// Update Module Progress (Time-based)
// Update Module Progress (Time-based) - Atomic Implementation
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

        const timeToAdd = parseInt(timeSpent) || 0;

        // Atomic Update: Increment timeSpent, set lastAccessed
        // We use pure Mongo update to avoid race conditions
        const progress = await Progress.findOneAndUpdate(
            { studentID, courseID },
            {
                $setOnInsert: {
                    studentID,
                    courseID,
                    completedModules: [],
                    percentComplete: 0
                },
                $set: { lastAccessed: new Date() }
            },
            { new: true, upsert: true }
        );

        // Now update the specific module in the array
        // We need to check if it exists in the array first
        const modIndex = progress.moduleProgress.findIndex(m => m.moduleID.toString() === moduleID);

        let modProgress;
        if (modIndex > -1) {
            // Update existing
            progress.moduleProgress[modIndex].timeSpent += timeToAdd;
            progress.moduleProgress[modIndex].lastUpdated = new Date();
            modProgress = progress.moduleProgress[modIndex];
        } else {
            // Push new
            const newEntry = {
                moduleID,
                timeSpent: timeToAdd,
                completed: false,
                lastUpdated: new Date()
            };
            progress.moduleProgress.push(newEntry);
            modProgress = newEntry;
        }

        // FIX for BUG #5: Document completion threshold with constant
        // Students must watch 80% of required viewing time to complete a module
        // This balances learning engagement with reasonable completion criteria
        // TODO: Consider making this configurable per course/module in future
        const COMPLETION_THRESHOLD = 0.8; // 80% of module duration required

        // FIX for BUG #4: Use minDuration field (required viewing time in minutes)
        // Note: module.minDuration is in minutes, fileMetadata.duration is video length in seconds
        const requiredSeconds = (module.minDuration || module.duration || 10) * 60 * COMPLETION_THRESHOLD;

        let newlyCompleted = false;
        if (!modProgress.completed && modProgress.timeSpent >= requiredSeconds) {
            modProgress.completed = true;
            newlyCompleted = true;

            // Sync with legacy completedModules array
            const alreadyRecorded = progress.completedModules.some(id => id.toString() === moduleID.toString());
            if (!alreadyRecorded) {
                progress.completedModules.push(moduleID);
            }
        }

        // Recalculate Course Percentage
        const totalModules = await Module.countDocuments({ courseId: courseID, status: 'Approved' });
        if (totalModules > 0) {
            const completedCount = progress.completedModules.length;
            progress.percentComplete = Math.round((completedCount / totalModules) * 100);
        }

        await progress.save();

        // Calculate next module ID if completed
        let nextModuleID = null;
        if (newlyCompleted) {
            const nextModule = await Module.findOne({
                courseId: courseID,
                order: { $gt: module.order },
                status: 'Approved'
            }).sort({ order: 1 });
            if (nextModule) nextModuleID = nextModule._id;
        }

        res.status(200).json({
            message: 'Progress updated',
            moduleCompleted: newlyCompleted,
            percentComplete: progress.percentComplete,
            nextModuleID: nextModuleID
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
