const { Course, Content, User, Exam, Result, Certificate, Notification } = require('../models/index');

// Create Course
exports.createCourse = async (req, res) => {
    try {
        const { title, description, category, price, difficulty, duration, introVideoUrl, introText, previewDuration } = req.body;
        const mentorID = req.user.id;

        const newCourse = new Course({
            title,
            description,
            category,
            price,
            mentors: [mentorID], // Assign creator as mentor
            difficulty: difficulty || 'Beginner',
            duration: duration || '4 Weeks',
            introVideoUrl,
            introText,
            previewDuration: previewDuration || 60,
            status: 'Draft', // Staff courses start as Draft
            createdBy: mentorID,
            thumbnail: 'https://via.placeholder.com/300x200'
        });

        await newCourse.save();
        res.status(201).json({ message: 'Course draft created and awaiting approval.', course: newCourse });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create course', error: err.message });
    }
};

// Upload Content
exports.uploadContent = async (req, res) => {
    try {
        const { courseID, type, previewDuration } = req.body;
        const uploadedBy = req.user.id;

        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const fileUrl = req.file.path;

        const newContent = new Content({
            courseID,
            uploadedBy,
            type,
            fileUrl,
            previewDuration: previewDuration || 0,
            status: 'Pending'
        });

        await newContent.save();
        res.status(201).json({ message: 'Content uploaded and pending approval', content: newContent });
    } catch (err) {
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
};

// --- Exam System ---

// Create Exam (Staff)
exports.createExam = async (req, res) => {
    try {
        const { courseID, title, duration, passingScore, activationThreshold, questions } = req.body;
        const { Exam } = require('../models/index');

        // Validation
        if (!courseID || !title) {
            return res.status(400).json({ message: 'Course and title are required' });
        }

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ message: 'At least one question is required' });
        }

        // Check if an assessment for this course already exists (Limit: 1 per course)
        const existingExam = await Exam.findOne({
            courseID: courseID,
            status: { $ne: 'Archived' } // Ignore archived/deleted ones if soft delete is used
        });

        if (existingExam) {
            console.log('[CONSTRAINT CHECK] Found existing exam for course:', existingExam._id);
            return res.status(400).json({
                message: 'This course already has an assessment. A course can only have one assessment. Please edit the existing one.',
                existingExamId: existingExam._id
            });
        }

        // Transform questions to match schema
        const transformedQuestions = questions.map((q, index) => {
            if (!q.question || !q.options || !Array.isArray(q.options)) {
                throw new Error(`Question ${index + 1} is missing required fields`);
            }

            // Support both single and multiple correct answers
            let correctIndices = [];
            if (Array.isArray(q.correctAnswerIndices)) {
                correctIndices = q.correctAnswerIndices.map(i => parseInt(i));
            } else if (q.correctAnswerIndex !== undefined) {
                correctIndices = [parseInt(q.correctAnswerIndex)];
            }

            if (correctIndices.length === 0) {
                throw new Error(`Question ${index + 1} must have at least one correct answer`);
            }

            return {
                questionText: q.question,
                options: q.options,
                correctOptionIndices: correctIndices
            };
        });

        const newExam = new Exam({
            courseID,
            title: title.trim(),
            duration: duration || 30,
            passingScore: passingScore || 70,
            activationThreshold: activationThreshold || 85,
            questions: transformedQuestions,
            createdBy: req.user.id,
            status: 'Draft',
            approvalStatus: 'Pending', // Explicitly set to Pending for admin approval
            updatedAt: new Date()
        });

        await newExam.save();
        console.log('[EXAM CREATED] ID:', newExam._id, 'Title:', newExam.title, 'ApprovalStatus:', newExam.approvalStatus);
        res.status(201).json({ message: 'Assessment created successfully', exam: newExam });
    } catch (err) {
        console.error('Exam creation error:', err);
        res.status(500).json({ message: 'Exam creation failed', error: err.message });
    }
};

// Start Exam Attempt - Create attempt session with randomized questions
exports.startExamAttempt = async (req, res) => {
    try {
        const { examID } = req.body;
        const studentID = req.user.id;

        const { ExamAttempt, Result, Exam, Certificate } = require('../models/index');

        // Get exam
        const exam = await Exam.findById(examID);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // FIRST: Check for certificate regardless of pass status (priority check)
        const certificate = await Certificate.findOne({
            studentID,
            courseID: exam.courseID
        });

        if (certificate) {
            console.log(`Certificate found for student ${studentID}, course ${exam.courseID}`);
            // Delete any incomplete attempts if they exist
            await ExamAttempt.deleteMany({
                studentID,
                examID,
                completed: false
            });

            return res.status(403).json({
                hasCertificate: true,
                message: 'You have already received a certificate for this course. The assessment cannot be attempted again.',
                certificateID: certificate._id
            });
        }

        // Check if already passed
        const passedResult = await Result.findOne({
            studentID,
            examID,
            status: 'Pass'
        });

        if (passedResult) {
            console.log(`Passed result found for student ${studentID}, exam ${examID}`);
            return res.status(403).json({
                message: 'You have already passed this assessment. No retakes allowed.'
            });
        }

        // Check for incomplete attempts
        const incompleteAttempt = await ExamAttempt.findOne({
            studentID,
            examID,
            completed: false
        });

        if (incompleteAttempt) {
            console.log(`Resuming incomplete attempt ${incompleteAttempt._id}`);
            // Return existing attempt with full exam settings
            return res.status(200).json({
                message: 'Resuming existing attempt',
                attemptID: incompleteAttempt._id,
                questionOrder: incompleteAttempt.questionOrder,
                startTime: incompleteAttempt.startTime,
                duration: exam.duration,
                passingScore: exam.passingScore,
                activationThreshold: exam.activationThreshold,
                questionCount: exam.questions.length,
                examTitle: exam.title
            });
        }

        // Create randomized question order
        const questionIndices = Array.from({ length: exam.questions.length }, (_, i) => i);
        const randomizedOrder = questionIndices.sort(() => Math.random() - 0.5);

        // Create new attempt
        const attempt = new ExamAttempt({
            studentID,
            examID,
            courseID: exam.courseID,
            questionOrder: randomizedOrder,
            startTime: new Date()
        });

        await attempt.save();

        res.status(201).json({
            message: 'Exam attempt started',
            attemptID: attempt._id,
            questionOrder: randomizedOrder,
            startTime: attempt.startTime,
            duration: exam.duration,
            passingScore: exam.passingScore,
            activationThreshold: exam.activationThreshold,
            questionCount: exam.questions.length,
            examTitle: exam.title
        });

    } catch (err) {
        console.error('Start attempt error:', err);
        res.status(500).json({ message: 'Failed to start exam', error: err.message });
    }
};

// Submit Exam (Student) - Enhanced with attempt tracking and retake prevention
exports.submitExam = async (req, res) => {
    try {
        const { attemptID, answers } = req.body;
        const studentID = req.user.id;

        const { ExamAttempt, User, Course } = require('../models/index');

        // Get the exam attempt
        const attempt = await ExamAttempt.findById(attemptID)
            .populate('examID')
            .populate('courseID', 'title mentors');

        if (!attempt) {
            console.error(`Attempt not found for ID: ${attemptID}, Student: ${studentID}`);

            // Check if student has certificate for any course (attempt might have been cleaned up)
            const { Certificate } = require('../models/index');
            const hasCertificate = await Certificate.findOne({ studentID });

            if (hasCertificate) {
                return res.status(403).json({
                    hasCertificate: true,
                    message: 'This exam attempt is no longer valid. You have already received a certificate for this course.',
                    certificateID: hasCertificate._id
                });
            }

            return res.status(404).json({
                message: 'Exam attempt not found or has expired. Please start a new assessment.'
            });
        }

        if (attempt.studentID.toString() !== studentID) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (attempt.completed) {
            return res.status(400).json({ message: 'This attempt has already been submitted' });
        }

        const exam = attempt.examID;
        const questionOrder = attempt.questionOrder;

        // Map answers back to original question order
        const mappedAnswers = [];
        answers.forEach((answer, idx) => {
            const originalQuestionIdx = questionOrder[idx];
            mappedAnswers[originalQuestionIdx] = answer;
        });

        // Grade Exam
        let score = 0;
        exam.questions.forEach((q, idx) => {
            const studentAnswer = mappedAnswers[idx];
            const correctIndices = q.correctOptionIndices || [q.correctOptionIndex];

            if (studentAnswer === undefined) return;

            const studentAnswers = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
            const cleanStudentAnswers = studentAnswers.map(i => parseInt(i));
            const cleanCorrectIndices = correctIndices.map(i => parseInt(i));

            const correctSet = new Set(cleanCorrectIndices);
            const studentSet = new Set(cleanStudentAnswers);

            if (correctSet.size === studentSet.size &&
                [...correctSet].every(val => studentSet.has(val))) {
                score++;
            }
        });

        const finalScore = Math.round((score / exam.questions.length) * 100);
        const status = finalScore >= exam.passingScore ? 'Pass' : 'Fail';

        // Update attempt
        attempt.endTime = new Date();
        attempt.completed = true;
        attempt.score = finalScore;
        attempt.status = 'Submitted';
        attempt.answers = answers;
        attempt.timeTaken = Math.round((attempt.endTime - attempt.startTime) / 1000); // seconds
        await attempt.save();

        // Save result
        const result = new Result({
            studentID,
            examID: exam._id,
            score: finalScore,
            status
        });
        await result.save();

        let certificateID = null;

        // If Passed, Issue or Update Certificate
        if (status === 'Pass') {
            let certificate = await Certificate.findOne({ studentID, courseID: exam.courseID });

            if (!certificate) {
                // Create new certificate
                // Get student and mentor info
                const student = await User.findById(studentID).select('studentID');
                const course = attempt.courseID;

                // Get mentor name
                let mentorName = 'AWARENESS ACADEMY';
                if (course.mentors && course.mentors.length > 0) {
                    const mentor = await User.findById(course.mentors[0]).select('name');
                    if (mentor) mentorName = mentor.name;
                }

                // Generate unique certificate ID: {courseID-4digits}{YY}{studentID-4digits}
                const courseIDLast4 = course._id.toString().slice(-4).toUpperCase();
                const year = new Date().getFullYear().toString().slice(-2);
                const studentIDLast4 = student.studentID ? student.studentID.slice(-4) : studentID.toString().slice(-4);
                const uniqueCertID = `${courseIDLast4}${year}${studentIDLast4}`;

                certificate = new Certificate({
                    studentID,
                    courseID: exam.courseID,
                    examScore: finalScore,
                    issueDate: new Date(),
                    completedAt: new Date(),
                    uniqueCertID,
                    mentorName,
                    percentage: finalScore
                });
                await certificate.save();
            } else {
                // FIX for BUG #6: Update certificate if new score is higher
                if (finalScore > certificate.examScore) {
                    console.log(`[CERTIFICATE UPDATE] Student ${studentID} achieved higher score: ${finalScore}% (previous: ${certificate.examScore}%)`);

                    certificate.examScore = finalScore;
                    certificate.percentage = finalScore;
                    certificate.issueDate = new Date(); // Update issue date to reflect improved achievement
                    // Keep original completedAt to preserve first completion date

                    await certificate.save();
                    console.log(`[CERTIFICATE UPDATE] Certificate updated with new score`);
                } else {
                    console.log(`[CERTIFICATE] Student ${studentID} passed again with ${finalScore}%, but existing certificate has higher score: ${certificate.examScore}%`);
                }
            }
            certificateID = certificate._id;
        }

        res.status(200).json({
            message: status === 'Pass' ? 'Congratulations! You have passed!' : 'Keep learning and try again!',
            score: finalScore,
            status,
            certificateID,
            passingScore: exam.passingScore
        });

    } catch (err) {
        console.error('Submission error:', err);
        res.status(500).json({ message: 'Submission failed', error: err.message });
    }
};

// Check Exam Eligibility - Enhanced to return previous attempts and pass status
exports.checkEligibility = async (req, res) => {
    try {
        const { courseID } = req.params;
        const studentID = req.user.id;

        const { Progress, Exam, Result, Certificate } = require('../models/index');

        // Find any exam for this course (Approved or Pending for testing)
        const exam = await Exam.findOne({
            courseID,
            approvalStatus: { $in: ['Approved', 'Pending'] }
        }).sort({ approvalStatus: -1, createdAt: -1 }); // Prefer Approved, then most recent

        if (!exam) {
            return res.status(404).json({
                eligible: false,
                message: 'No assessment available for this course yet.'
            });
        }

        // Check if already has certificate (priority check)
        const certificate = await Certificate.findOne({ studentID, courseID });

        if (certificate) {
            console.log(`Certificate exists for student ${studentID}, course ${courseID}`);

            // Clean up any incomplete attempts
            const { ExamAttempt } = require('../models/index');
            const deletedCount = await ExamAttempt.deleteMany({
                studentID,
                courseID,
                completed: false
            });

            if (deletedCount.deletedCount > 0) {
                console.log(`Cleaned up ${deletedCount.deletedCount} incomplete attempts`);
            }

            return res.status(200).json({
                eligible: false,
                alreadyPassed: true,
                hasCertificate: true,
                message: 'You have already received a certificate for this course! The assessment cannot be reattempted.',
                certificateID: certificate._id
            });
        }

        // Check if already passed
        const passedResult = await Result.findOne({
            studentID,
            examID: exam._id,
            status: 'Pass'
        });

        if (passedResult) {
            return res.status(200).json({
                eligible: false,
                alreadyPassed: true,
                message: 'You have already passed this assessment!',
                score: passedResult.score
            });
        }

        // Check progress
        const progress = await Progress.findOne({ studentID, courseID });
        const percent = progress ? progress.percentComplete : 0;

        if (percent < exam.activationThreshold) {
            return res.status(200).json({
                eligible: false,
                message: `Complete ${exam.activationThreshold}% of the course to unlock this assessment.`,
                progress: percent,
                threshold: exam.activationThreshold
            });
        }

        // Get previous attempts count
        const { ExamAttempt } = require('../models/index');
        const attemptCount = await ExamAttempt.countDocuments({
            studentID,
            examID: exam._id,
            completed: true
        });


        res.status(200).json({
            eligible: true,
            examID: exam._id,
            title: exam.title,
            duration: exam.duration,
            passingScore: exam.passingScore,
            questionCount: exam.questions.length,
            attemptCount,
            isPending: exam.approvalStatus === 'Pending',
            warningMessage: exam.approvalStatus === 'Pending' ?
                'This assessment is in testing mode and has not been officially approved yet.' : null
        });
    } catch (err) {
        console.error('Eligibility check error:', err);
        res.status(500).json({ message: 'Eligibility check failed', error: err.message });
    }
};

// Get Enrolled Students for Staff
exports.getEnrolledStudents = async (req, res) => {
    try {
        const { Enrollment, User, Course, Progress } = require('../models/index');

        console.log('Getting students for mentor:', req.user.id);

        // 1. Find all courses by this mentor
        const myCourses = await Course.find({ mentors: { $in: [req.user.id] } }).select('_id title');
        console.log('Found courses:', myCourses.length);

        if (myCourses.length === 0) {
            console.log('No courses found for mentor');
            return res.status(200).json([]);
        }

        const courseIDs = myCourses.map(c => c._id);
        console.log('Course IDs:', courseIDs);

        // 2. Find all enrollments for these courses
        const enrollments = await Enrollment.find({ courseID: { $in: courseIDs } })
            .populate('studentID', 'name email studentID profilePic')
            .populate('courseID', 'title')
            .sort({ enrolledAt: -1 })
            .lean(); // Convert to standard JS objects to append extra fields

        console.log('Found enrollments:', enrollments.length);

        if (enrollments.length === 0) {
            console.log('No enrollments found for mentor courses');
            return res.status(200).json([]);
        }

        // 3. Attach Progress - filter out enrollments with missing references
        const validEnrollments = enrollments.filter(e => {
            const isValid = e.studentID && e.courseID;
            if (!isValid) {
                console.log('Filtering out invalid enrollment:', e._id, 'Missing:', !e.studentID ? 'studentID' : 'courseID');
            }
            return isValid;
        });

        console.log('Valid enrollments after filtering:', validEnrollments.length);

        const insights = await Promise.all(validEnrollments.map(async (e) => {
            try {
                const progress = await Progress.findOne({
                    studentID: e.studentID._id,
                    courseID: e.courseID._id
                });

                const result = {
                    ...e,
                    percentComplete: progress ? progress.percentComplete : 0
                };

                console.log(`Progress for student ${e.studentID.name}: ${result.percentComplete}%`);
                return result;

            } catch (progressErr) {
                console.error('Error fetching progress for enrollment:', e._id, progressErr);
                return {
                    ...e,
                    percentComplete: 0
                };
            }
        }));

        console.log('Returning insights:', insights.length);
        res.status(200).json(insights);

    } catch (err) {
        console.error('Error in getEnrolledStudents:', err);
        res.status(500).json({
            message: 'Failed to fetch student insights',
            error: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

// Get Staff Courses
exports.getStaffCourses = async (req, res) => {
    try {
        const courses = await Course.find({
            mentors: { $in: [req.user.id] },
            status: { $ne: 'Archived' } // Exclude archived courses
        });
        res.status(200).json(courses);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch courses', error: err.message });
    }
};

// Get Staff Modules (Replaces Materials)
exports.getStaffModules = async (req, res) => {
    try {
        const { Module } = require('../models/index');
        const modules = await Module.find({
            createdBy: req.user.id,
            status: { $ne: 'Archived' }
        }).populate('courseId', 'title');

        res.status(200).json(modules);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch modules', error: err.message });
    }
};

// Get Deleted/Inactive Courses for Staff (for notifications)
exports.getDeletedCourses = async (req, res) => {
    try {
        const deletedCourses = await Course.find({
            mentors: { $in: [req.user.id] },
            status: 'Archived'
        }).select('title deletedAt category');

        res.status(200).json(deletedCourses);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch deleted courses', error: err.message });
    }
};

// Get Staff Profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -verificationToken -resetPasswordToken');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
    }
};

// Update Staff Profile
exports.updateProfile = async (req, res) => {
    try {
        const {
            name, fatherName, motherName, dob,
            doorNumber, streetName, town, district, pincode,
            phone, additionalPhone,
            accountHolderName, accountNumber, bankName, ifscCode, branchName
        } = req.body;

        const updateData = {
            name,
            fatherName,
            motherName,
            dob,
            phone,
            additionalPhone,
            'address.doorNumber': doorNumber,
            'address.streetName': streetName,
            'address.town': town,
            'address.district': district,
            'address.pincode': pincode,
            'bankDetails.accountHolderName': accountHolderName,
            'bankDetails.accountNumber': accountNumber,
            'bankDetails.bankName': bankName,
            'bankDetails.ifscCode': ifscCode,
            'bankDetails.branchName': branchName,
            lastEditedAt: Date.now()
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key =>
            updateData[key] === undefined && delete updateData[key]
        );

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -verificationToken -resetPasswordToken');

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update profile', error: err.message });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.lastEditedAt = Date.now();
        await user.save();

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to change password', error: err.message });
    }
};

// --- Notifications ---

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 }).limit(50);
        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
    }
};

exports.toggleNotificationRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { read: req.body.read },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.status(200).json({ message: 'Notification updated', notification });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update notification', error: err.message });
    }
};

exports.markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update notifications', error: err.message });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user.id
        });
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.status(200).json({ message: 'Notification deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete notification', error: err.message });
    }
};
