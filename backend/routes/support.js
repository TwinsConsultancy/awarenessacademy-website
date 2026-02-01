const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const authorize = require('../middleware/auth');

router.post('/create', authorize(), supportController.createTicket);
router.get('/my-tickets', authorize(), supportController.getMyTickets);

module.exports = router;
