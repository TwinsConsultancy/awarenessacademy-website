const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const authorize = require('../middleware/auth');

router.post('/add', authorize(), forumController.addComment);
router.get('/course/:courseID', authorize(), forumController.getCourseForum);

module.exports = router;
