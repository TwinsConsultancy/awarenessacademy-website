const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const authorize = require('../middleware/auth');

router.get('/my', authorize('Student'), certificateController.getMyCertificates);
router.get('/:id', authorize(['Student', 'Admin']), certificateController.getCertificateDetails);

module.exports = router;
