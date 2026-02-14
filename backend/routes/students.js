const express = require('express');
const router = express.Router();
const authorize = require('../middleware/auth');
const {
    Enrollment,
    Course,
    Certificate,
    Result,
    Exam,
    ExamAttempt,
    User
} = require('../models/index');

// Get Student Dashboard Analytics
router.get('/analytics', authorize('Student'), async (req, res) => {
    try {
        const studentID = req.user.id;

        // Get enrollments with course details
        const enrollments = await Enrollment.find({ studentID })
            .populate('courseID', 'title category thumbnail')
            .lean();

        // Calculate stats
        const enrolledCourses = enrollments.length;
        const overallProgress = enrollments.length > 0
            ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length)
            : 0;

        // Get certificates
        const certificates = await Certificate.find({ studentID }).lean();
        const certificatesEarned = certificates.length;

        // Calculate study streak (simplified - based on recent enrollment activity)
        const studyStreak = await calculateStudyStreak(studentID);

        // Get weekly progress data (last 7 days)
        const progressData = await getWeeklyProgress(studentID);

        // Get course distribution by category
        const courseDistribution = {};
        enrollments.forEach(e => {
            const category = e.courseID?.category || 'Other';
            courseDistribution[category] = (courseDistribution[category] || 0) + 1;
        });

        const distributionArray = Object.entries(courseDistribution).map(([category, count]) => ({
            category,
            count
        }));

        // Get recent activity (last 10 items)
        const recentActivity = await getRecentActivity(studentID);

        // Get upcoming exams (exams student is eligible for)
        const upcomingExams = await getUpcomingExams(studentID);

        // Get achievement badges
        const achievements = calculateAchievements({
            enrolledCourses,
            certificatesEarned,
            studyStreak,
            overallProgress
        });

        res.json({
            stats: {
                enrolledCourses,
                overallProgress,
                certificatesEarned,
                studyStreak
            },
            progressData,
            courseDistribution: distributionArray,
            recentActivity,
            upcomingExams,
            achievements
        });

    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ message: 'Failed to fetch analytics', error: err.message });
    }
});

// Helper: Calculate study streak
async function calculateStudyStreak(studentID) {
    try {
        // Get recent exam attempts and enrollment updates
        const recentAttempts = await ExamAttempt.find({ studentID })
            .sort({ startTime: -1 })
            .limit(30)
            .lean();

        if (recentAttempts.length === 0) return 0;

        // Simple streak: count consecutive days with activity
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let streak = 0;
        let checkDate = new Date(today);

        for (let i = 0; i < 30; i++) {
            const hasActivity = recentAttempts.some(attempt => {
                const attemptDate = new Date(attempt.startTime);
                attemptDate.setHours(0, 0, 0, 0);
                return attemptDate.getTime() === checkDate.getTime();
            });

            if (hasActivity) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (streak > 0) {
                break; // Streak broken
            } else {
                checkDate.setDate(checkDate.getDate() - 1);
            }
        }

        return streak;
    } catch (err) {
        console.error('Streak calculation error:', err);
        return 0;
    }
}

// Helper: Get weekly progress
async function getWeeklyProgress(studentID) {
    try {
        const enrollments = await Enrollment.find({ studentID }).lean();

        // For now, return current progress distribution
        // In production, you'd track progress history over time
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const avgProgress = enrollments.length > 0
            ? enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length
            : 0;

        // Simulate weekly growth (in production, use actual historical data)
        const values = daysOfWeek.map((_, idx) => {
            return Math.round(Math.max(0, avgProgress - (6 - idx) * 5));
        });

        return {
            labels: daysOfWeek,
            values
        };
    } catch (err) {
        console.error('Weekly progress error:', err);
        return { labels: [], values: [] };
    }
}

// Helper: Get recent activity
async function getRecentActivity(studentID) {
    try {
        const activity = [];

        // Get recent enrollments
        const enrollments = await Enrollment.find({ studentID })
            .sort({ enrolledAt: -1 })
            .limit(5)
            .populate('courseID', 'title')
            .lean();

        enrollments.forEach(e => {
            activity.push({
                type: 'enrollment',
                title: `Enrolled in "${e.courseID?.title || 'Course'}"`,
                timestamp: e.enrolledAt,
                icon: 'graduation-cap',
                color: '#FF9933'
            });
        });

        // Get recent exam attempts
        const attempts = await ExamAttempt.find({ studentID, completed: true })
            .sort({ endTime: -1 })
            .limit(5)
            .populate({
                path: 'examID',
                select: 'title'
            })
            .lean();

        attempts.forEach(a => {
            const passed = a.score >= 70; // You can get actual passing score from exam
            activity.push({
                type: 'assessment',
                title: passed
                    ? `Passed "${a.examID?.title || 'Assessment'}" with ${a.score}%`
                    : `Attempted "${a.examID?.title || 'Assessment'}" (${a.score}%)`,
                timestamp: a.endTime,
                icon: passed ? 'check-circle' : 'edit',
                color: passed ? '#10B981' : '#F59E0B'
            });
        });

        // Get recent certificates
        const certificates = await Certificate.find({ studentID })
            .sort({ issueDate: -1 })
            .limit(3)
            .populate('courseID', 'title')
            .lean();

        certificates.forEach(c => {
            activity.push({
                type: 'certificate',
                title: `Earned certificate for "${c.courseID?.title || 'Course'}"`,
                timestamp: c.issueDate,
                icon: 'award',
                color: '#FFC300'
            });
        });

        // Sort by timestamp and return latest 10
        activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return activity.slice(0, 10);

    } catch (err) {
        console.error('Recent activity error:', err);
        return [];
    }
}

// Helper: Get upcoming exams
async function getUpcomingExams(studentID) {
    try {
        // Get student's enrollments with progress
        const enrollments = await Enrollment.find({ studentID }).lean();
        const courseIDs = enrollments.map(e => e.courseID);

        // Get exams for these courses
        const exams = await Exam.find({
            courseID: { $in: courseIDs },
            approved: true
        }).populate('courseID', 'title').lean();

        const upcomingExams = [];

        for (const exam of exams) {
            // Check if already passed
            const passedResult = await Result.findOne({
                studentID,
                examID: exam._id,
                status: 'Pass'
            });

            if (passedResult) continue; // Skip if already passed

            // Check if eligible (progress >= threshold)
            const enrollment = enrollments.find(e =>
                e.courseID.toString() === exam.courseID._id.toString()
            );

            if (enrollment && enrollment.progress >= exam.activationThreshold) {
                upcomingExams.push({
                    examID: exam._id,
                    title: exam.title,
                    courseTitle: exam.courseID.title,
                    passingScore: exam.passingScore,
                    duration: exam.duration,
                    questionCount: exam.questions.length
                });
            }
        }

        return upcomingExams;

    } catch (err) {
        console.error('Upcoming exams error:', err);
        return [];
    }
}

// Helper: Calculate achievements
function calculateAchievements(stats) {
    const achievements = [];

    if (stats.enrolledCourses > 0) {
        achievements.push({
            id: 'first_course',
            title: 'First Course',
            description: 'Enrolled in your first course',
            icon: 'graduation-cap',
            earned: true
        });
    }

    if (stats.certificatesEarned > 0) {
        achievements.push({
            id: 'certificate_earner',
            title: 'Certificate Earner',
            description: 'Earned your first certificate',
            icon: 'award',
            earned: true
        });
    }

    if (stats.studyStreak >= 5) {
        achievements.push({
            id: '5_day_streak',
            title: '5-Day Streak',
            description: 'Studied for 5 consecutive days',
            icon: 'fire',
            earned: true
        });
    }

    if (stats.overallProgress >= 50) {
        achievements.push({
            id: 'halfway_there',
            title: 'Halfway There',
            description: 'Reached 50% overall progress',
            icon: 'chart-line',
            earned: true
        });
    }

    return achievements;
}

module.exports = router;
