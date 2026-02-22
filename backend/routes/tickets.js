const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authorize = require('../middleware/auth');

// Admin routes MUST come before parameterized routes
router.get('/admin/all', authorize('Admin'), ticketController.getAllTickets);
router.get('/admin/unread-count', authorize('Admin'), ticketController.getUnreadCount);
router.patch('/admin/mark-all-read', authorize('Admin'), ticketController.markAllAsRead);
router.post('/admin/update-priorities', authorize('Admin'), ticketController.updateAllPriorities);

// User routes (Staff & Student)
router.post('/', authorize(['Staff', 'Student']), ticketController.createTicket);
router.get('/my', authorize(['Staff', 'Student']), ticketController.getMyTickets);

// Parameterized routes MUST come after specific routes
router.get('/:id', authorize(['Staff', 'Student', 'Admin']), ticketController.getTicketById);
router.post('/:id/reply', authorize(['Staff', 'Student', 'Admin']), ticketController.addReply);
router.patch('/:id/status', authorize('Admin'), ticketController.updateTicketStatus);
router.patch('/:id/priority', authorize('Admin'), ticketController.updateTicketPriority);
router.patch('/:id/mark-read', authorize('Admin'), ticketController.markAsReadByAdmin);

module.exports = router;
