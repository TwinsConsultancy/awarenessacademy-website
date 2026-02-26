const { Course, Content, Impression, User, CourseSubscriber, Progress, Notification } = require('../models/index');
const { sendCoursePublishedNotification } = require('../utils/emailService');

// Get Enrolled Courses for Student
exports.getEnrolledCourses = async (req, res) => {
    try {
        console.log('getEnrolledCourses - User ID:', req.user?.id);
        const { Module } = require('../models/index');

        const user = await User.findById(req.user.id).populate({
            path: 'enrolledCourses',
            populate: { path: 'mentors', select: 'name' }
        });

        console.log('User found:', user ? 'Yes' : 'No');
        console.log('Enrolled courses count:', user?.enrolledCourses?.length || 0);

        // Handle case where user has no enrolled courses
        if (!user || !user.enrolledCourses) {
            return res.status(200).json([]);
        }

        // Get module counts for enrolled courses
        const courseIds = user.enrolledCourses.map(c => c._id);
        const moduleAggregation = await Module.aggregate([
            {
                $match: {
                    courseId: { $in: courseIds },
                    status: 'Approved'
                }
            },
            {
                $group: {
                    _id: "$courseId",
                    totalModules: { $sum: 1 }
                }
            }
        ]);

        const moduleMap = {};
        moduleAggregation.forEach(stat => {
            if (stat._id) {
                moduleMap[stat._id.toString()] = stat.totalModules;
            }
        });

        // Fetch progress data for all enrolled courses
        const progressRecords = await Progress.find({ studentID: req.user.id }).lean();
        const progressMap = {};
        progressRecords.forEach(p => {
            progressMap[p.courseID.toString()] = {
                percentage: p.percentComplete || 0,
                completedLessons: p.completedLessons || [],
                lastAccessed: p.lastAccessed
            };
        });

        // Attach progress data and module counts to each course
        const coursesWithProgress = user.enrolledCourses.map(course => {
            const courseObj = course.toObject ? course.toObject() : course;
            const courseId = courseObj._id.toString();
            courseObj.progress = progressMap[courseId] || { percentage: 0, completedLessons: [], lastAccessed: null };
            courseObj.totalLessons = moduleMap[courseId] || 0;
            return courseObj;
        });

        res.status(200).json(coursesWithProgress);
    } catch (err) {
        console.error('getEnrolledCourses error:', err.message, err.stack);
        res.status(500).json({ message: 'Fetch failed', error: err.message });
    }
};

// Get Marketplace Courses (Approved & Published)
exports.getMarketplace = async (req, res) => {
    try {
        const { Feedback, Module } = require('../models/index');

        // Fetch both Approved (Upcoming) and Published (Current) courses
        const courses = await Course.find({
            status: { $in: ['Approved', 'Published'] }
        }).populate('mentors', 'name').lean();

        // Get rating aggregation for courses
        const ratingAggregation = await Feedback.aggregate([
            { $match: { courseId: { $in: courses.map(c => c._id.toString()) } } }, // courseId stored as string
            {
                $group: {
                    _id: "$courseId",
                    avgRating: { $avg: "$overallRating" },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        // Get module count aggregation for courses  
        const moduleAggregation = await Module.aggregate([
            {
                $match: {
                    courseId: { $in: courses.map(c => c._id) }, // courseId stored as ObjectId in modules
                    status: 'Approved'
                }
            },
            {
                $group: {
                    _id: "$courseId",
                    totalModules: { $sum: 1 }
                }
            }
        ]);

        // Create lookup maps for ratings and module counts
        const ratingMap = {};
        ratingAggregation.forEach(stat => {
            if (stat._id) {
                ratingMap[stat._id.toString()] = {
                    avg: parseFloat(stat.avgRating.toFixed(1)),
                    total: stat.totalReviews
                };
            }
        });

        const moduleMap = {};
        moduleAggregation.forEach(stat => {
            if (stat._id) {
                moduleMap[stat._id.toString()] = stat.totalModules;
            }
        });

        // Attach ratings and module counts to course objects
        const coursesWithData = courses.map(c => {
            const stats = ratingMap[c._id.toString()];
            const moduleCount = moduleMap[c._id.toString()];
            return {
                ...c,
                rating: stats ? stats.avg : null, // Return null if no reviews
                reviewCount: stats ? stats.total : 0,
                totalLessons: moduleCount || 0 // Real module count
            };
        });

        res.status(200).json(coursesWithData);
    } catch (err) {
        console.error('Marketplace error:', err);
        res.status(500).json({ message: 'Marketplace load failed', error: err.message });
    }
};

// Get Course Preview Data (Public)
exports.getCoursePreview = async (req, res) => {
    try {
        const { id } = req.params;
        const { Feedback, Module } = require('../models/index');
        const course = await Course.findById(id).populate('mentors', 'name').lean();

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Calculate average rating
        const feedbackStats = await Feedback.aggregate([
            { $match: { courseId: id.toString() } }, // courseId is stored as string
            { $group: { _id: "$courseId", avgRating: { $avg: "$overallRating" }, totalReviews: { $sum: 1 } } }
        ]);

        if (feedbackStats.length > 0) {
            course.rating = parseFloat(feedbackStats[0].avgRating.toFixed(1));
            course.reviewCount = feedbackStats[0].totalReviews;
        } else {
            course.rating = null; // No reviews yet
            course.reviewCount = 0;
        }

        // Fetch published modules
        const validStatuses = ['Approved', 'Published'];

        const previewModules = await Module.find({
            courseId: id,
            status: { $in: validStatuses }
        }).select('title status');

        res.status(200).json({
            course: {
                ...course,
                mentor: course.mentors && course.mentors.length > 0 ? course.mentors.map(m => m.name).join(', ') : 'No mentor assigned'
            },
            previews: previewModules
        });
    } catch (err) {
        console.error('Preview error:', err);
        res.status(500).json({ message: 'Failed to load specific preview', error: err.message });
    }
};

// Get Course Details & Content (Modules)
exports.getCourseDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { Module, User, Enrollment, Feedback } = require('../models/index');

        let course = await Course.findById(id).populate('mentors', 'name').lean();
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Calculate average rating
        const feedbackStats = await Feedback.aggregate([
            { $match: { courseId: id.toString() } }, // courseId is stored as string
            { $group: { _id: "$courseId", avgRating: { $avg: "$overallRating" }, totalReviews: { $sum: 1 } } }
        ]);

        if (feedbackStats.length > 0) {
            course.rating = parseFloat(feedbackStats[0].avgRating.toFixed(1));
            course.reviewCount = feedbackStats[0].totalReviews;
        } else {
            course.rating = null; // No reviews yet
            course.reviewCount = 0;
        }

        // Fetch Modules
        // Only show Approved/Published modules
        const validStatuses = ['Approved', 'Published'];

        const modules = await Module.find({
            courseId: id,
            status: { $in: validStatuses }
        }).sort({ order: 1 });

        // Add real module count to course
        course.totalLessons = modules.length;

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

        res.status(200).json({
            course,
            modules,
            hasFullAccess,
            isExpired
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch details', error: err.message });
    }
};

// ... trackImpression kept same ...

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
// --- Admin Functions ---

// Get All Courses (Admin View)
exports.getAllCoursesAdmin = async (req, res) => {
    try {
        const { Module } = require('../models/index');

        const courses = await Course.find().populate('mentors', 'name email');

        // Get module counts for all courses
        const courseIds = courses.map(c => c._id);
        const moduleAggregation = await Module.aggregate([
            {
                $match: {
                    courseId: { $in: courseIds },
                    status: 'Approved'
                }
            },
            {
                $group: {
                    _id: "$courseId",
                    totalModules: { $sum: 1 }
                }
            }
        ]);

        const moduleMap = {};
        moduleAggregation.forEach(stat => {
            if (stat._id) {
                moduleMap[stat._id.toString()] = stat.totalModules;
            }
        });

        // Attach module counts to courses
        const coursesWithModuleCounts = courses.map(course => {
            const courseObj = course.toObject ? course.toObject() : course;
            courseObj.totalLessons = moduleMap[courseObj._id.toString()] || 0;
            return courseObj;
        });

        // Debug: Log course statuses
        console.log('\n📚 Courses retrieved for admin:');
        coursesWithModuleCounts.forEach((course, idx) => {
            console.log(`${idx + 1}. ${course.title}`);
            console.log(`   Status: ${course.status}`);
            console.log(`   Modules: ${course.totalLessons}`);
        });

        res.status(200).json(coursesWithModuleCounts);
    } catch (err) {
        res.status(500).json({ message: 'Failed to load courses', error: err.message });
    }
};

// Create Course
exports.createCourse = async (req, res) => {
    try {
        const { title, description, price, mentors, category, difficulty, duration, thumbUrl, status, introVideoUrl, introText, previewDuration } = req.body;
        const user = await User.findById(req.user.id);

        // Determine course status based on role:
        // Staff creates -> 'Draft' (then submits to Pending via separate action, or auto Pending?)
        // Plan says: Staff create course as draft -> add modules -> submit.

        let initialStatus = 'Draft';

        if (user.role === 'Admin') {
            initialStatus = status || 'Draft';
        }

        const newCourse = new Course({
            title,
            description,
            price,
            mentors: mentors || [], // Array of User IDs
            category,
            difficulty: difficulty || 'Beginner',
            duration: duration || '4 Weeks',
            thumbnail: thumbUrl || 'https://via.placeholder.com/300x200',
            introVideoUrl,
            introText,
            previewDuration: previewDuration || 60,
            status: initialStatus,
            createdBy: req.user.id
        });
        await newCourse.save();
        res.status(201).json({ message: 'Course created', course: newCourse });
    } catch (err) {
        res.status(500).json({ message: 'Creation failed', error: err.message });
    }
};

// Update Course
exports.updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Get the old course to check status change
        const oldCourse = await Course.findById(id);
        if (!oldCourse) return res.status(404).json({ message: 'Course not found' });

        const course = await Course.findByIdAndUpdate(id, updates, { new: true }).populate('mentors', 'name');

        // Notify course mentors on status change
        if (updates.status && oldCourse.status !== updates.status) {
            const notifPromises = course.mentors.map(mentor => new Notification({
                recipient: mentor._id,
                type: 'Course',
                title: 'Course Status Updated',
                message: `Your course "${course.title}" status changed from ${oldCourse.status} to ${updates.status}.`,
                relatedId: course._id
            }).save());
            await Promise.allSettled(notifPromises);
        }

        // If status changed from anything to Published, notify subscribers
        if (oldCourse.status !== 'Published' && updates.status === 'Published') { // Status changed to Published

            // Find all subscribers for this course who haven't been notified
            const subscribers = await CourseSubscriber.find({
                courseID: id,
                notified: false
            });

            if (subscribers.length > 0) {
                console.log(`📧 Notifying ${subscribers.length} subscribers about published course: ${course.title}`);

                // Send emails to all subscribers
                const emailPromises = subscribers.map(async (subscriber) => {
                    try {
                        await sendCoursePublishedNotification({
                            subscriberName: subscriber.name,
                            subscriberEmail: subscriber.email,
                            courseTitle: course.title,
                            courseCategory: course.category,
                            courseMentor: course.mentors?.map(m => m.name).join(', ') || 'InnerSpark Team',
                            coursePrice: course.price
                        });

                        // Mark subscriber as notified
                        subscriber.notified = true;
                        subscriber.notifiedAt = new Date();
                        await subscriber.save();

                        return { success: true, email: subscriber.email };
                    } catch (error) {
                        console.error(`Failed to notify ${subscriber.email}:`, error.message);
                        return { success: false, email: subscriber.email, error: error.message };
                    }
                });

                const results = await Promise.allSettled(emailPromises);
                const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
                console.log(`✅ Successfully notified ${successCount}/${subscribers.length} specific course waiters`);
            }

            // --- NOTIFY GENERAL NEWSLETTER SUBSCRIBERS ---
            const { Newsletter } = require('../models/index');
            const newsletterSubscribers = await Newsletter.find();

            if (newsletterSubscribers.length > 0) {
                console.log(`📧 Notifying ${newsletterSubscribers.length} newsletter subscribers about new course: ${course.title}`);

                // Using the same email service but iterating over newsletter list
                // Optimally this should be a bulk send or queue, but looping for now as per current pattern
                const nlPromises = newsletterSubscribers.map(async (sub) => {
                    try {
                        await sendCoursePublishedNotification({
                            subscriberName: 'Subscriber', // Generic name as we only have email
                            subscriberEmail: sub.email,
                            courseTitle: course.title,
                            courseCategory: course.category,
                            courseMentor: course.mentors?.map(m => m.name).join(', ') || 'InnerSpark Team',
                            coursePrice: course.price
                        });
                        return { success: true };
                    } catch (e) {
                        console.error(`Failed to notify newsletter sub ${sub.email}`, e.message);
                        return { success: false };
                    }
                });

                // Fire and forget - don't await all if it takes too long, or await if critical? 
                // Awaiting to be safe on serverless/instances execution context
                await Promise.allSettled(nlPromises);
                console.log(`✅ Newsletter notifications processing complete.`);
            }
        }

        res.status(200).json({ message: 'Course updated', course });
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
};

// Delete Course
exports.deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { Enrollment } = require('../models/index');

        const course = await Course.findById(id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Check for active enrollments
        const enrollments = await Enrollment.find({ courseID: id }).populate('studentID', 'name email');

        if (enrollments.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete course with active enrollments',
                enrollmentCount: enrollments.length,
                students: enrollments.map(e => ({
                    id: e.studentID._id,
                    name: e.studentID.name,
                    email: e.studentID.email
                }))
            });
        }

        // Soft delete - change status to Inactive
        course.status = 'Inactive';
        course.deletedAt = new Date();
        await course.save();

        res.status(200).json({ message: 'Course marked as deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Deletion failed', error: err.message });
    }
};

// Get Course Details with Enrollments (Admin only)
// Get Course Details with Enrollments (Admin only)
exports.getCourseWithEnrollments = async (req, res) => {
    try {
        console.log('getCourseWithEnrollments called with ID:', req.params.id);
        const { id } = req.params;
        const { Enrollment } = require('../models/index');

        const course = await Course.findById(id).populate('mentors', 'name email');
        if (!course) {
            console.log('Course not found:', id);
            return res.status(404).json({ message: 'Course not found' });
        }

        const enrollments = await Enrollment.find({ courseID: id })
            .populate('studentID', 'name email studentID')
            .sort({ enrolledAt: -1 });

        console.log('Found enrollments:', enrollments.length);

        // Filter out enrollments with null studentID (deleted students)
        const validEnrollments = enrollments.filter(e => e.studentID != null);
        console.log('Valid enrollments (with existing students):', validEnrollments.length);

        const enrolledStudents = validEnrollments.map(e => ({
            enrollmentId: e._id,
            studentId: e.studentID._id,
            name: e.studentID.name,
            email: e.studentID.email,
            studentID: e.studentID.studentID,
            enrolledAt: e.enrolledAt,
            expiryDate: e.expiryDate,
            progress: e.progress || 0,
            completed: e.completed || false
        }));

        res.status(200).json({
            course: {
                _id: course._id,
                title: course.title,
                description: course.description,
                category: course.category,
                price: course.price,
                status: course.status,
                mentors: course.mentors,
                difficulty: course.difficulty,
                duration: course.duration,
                thumbnail: course.thumbnail,
                createdAt: course.createdAt
            },
            students: enrolledStudents,
            stats: {
                totalEnrolled: enrolledStudents.length,
                completed: enrolledStudents.filter(s => s.completed).length,
                inProgress: enrolledStudents.filter(s => !s.completed).length
            }
        });
    } catch (err) {
        console.error('Error in getCourseWithEnrollments:', err);
        res.status(500).json({ message: 'Failed to fetch course details', error: err.message });
    }
};

// Remove students from course
exports.removeStudentsFromCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { studentIds } = req.body;
        const { Enrollment } = require('../models/index');

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: 'Student IDs required' });
        }

        // Remove enrollments
        const result = await Enrollment.deleteMany({
            courseID: id,
            studentID: { $in: studentIds }
        });

        // Remove course from students' enrolledCourses array
        await User.updateMany(
            { _id: { $in: studentIds } },
            { $pull: { enrolledCourses: id } }
        );

        res.status(200).json({
            message: 'Students removed from course',
            count: result.deletedCount
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to remove students', error: err.message });
    }
};
