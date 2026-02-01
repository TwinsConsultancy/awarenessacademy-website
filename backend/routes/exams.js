const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const authorize = require('../middleware/auth');

// Create Exam (Staff)
router.post('/create', authorize(['Staff', 'Admin']), staffController.createExam);

// Submit Exam (Student)
router.post('/submit', authorize(['Student', 'Admin']), staffController.submitExam);

// Check Eligibility (Student)
router.get('/eligibility/:courseID', authorize('Student'), staffController.checkEligibility);

// Get Exams for Course
router.get('/course/:courseID', authorize(['Student', 'Staff', 'Admin']), async (req, res) => {
    try {
        const { Exam } = require('../models/index');
        const exams = await Exam.find({ courseID: req.params.courseID });
        res.status(200).json(exams);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed', error: err.message });
    }
});

// Get Single Exam
router.get('/:id', authorize(['Student', 'Staff', 'Admin']), async (req, res) => {
    try {
        const { Exam } = require('../models/index');
        const exam = await Exam.findById(req.params.id);
        res.status(200).json(exam);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed', error: err.message });
    }
});

module.exports = router;
