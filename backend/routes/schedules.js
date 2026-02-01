const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const authorize = require('../middleware/auth');

// Create schedule (Staff only)
router.post('/', authorize(['Staff', 'Admin']), scheduleController.createSchedule);

// Get course specific schedules
router.get('/course/:courseID', authorize(['Student', 'Staff', 'Admin']), scheduleController.getCourseSchedules);

// Get my timetable (Student or Staff)
router.get('/my-timetable', authorize(['Student', 'Staff', 'Admin']), scheduleController.getMyTimetable);

module.exports = router;
