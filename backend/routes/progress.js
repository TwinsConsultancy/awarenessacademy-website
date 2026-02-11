const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authorize = require('../middleware/auth');

router.post('/update-progress', authorize(), progressController.updateProgress);
router.get('/:courseID', authorize(), progressController.getCourseProgress);

module.exports = router;
