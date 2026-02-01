const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authorize = require('../middleware/auth');

router.use(authorize(['Student', 'Admin']));

// @route   POST /api/attendance/mark
// @desc    Mark attendance for a live session
router.post('/mark', attendanceController.markAttendance);

// @route   GET /api/attendance/my
// @desc    Get current user's attendance history
router.get('/my', attendanceController.getMyAttendance);

module.exports = router;
