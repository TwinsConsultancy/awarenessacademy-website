// Load models/index first to ensure User model is registered
const models = require('../models/index');
const User = models.User;
const Ticket = models.Ticket;

// @desc    Create a new ticket
// @route   POST /api/tickets
// @access  Staff, Student
exports.createTicket = async (req, res) => {
    try {
        const { subject, description } = req.body;

        if (!subject || !description) {
            return res.status(400).json({ message: 'Subject and description are required' });
        }

        // Automatic priority assignment based on subject
        let priority = 'Medium'; // default
        
        if (subject === 'Payment Issue' || subject === 'Account Related') {
            priority = 'Urgent';
        } else if (subject === 'Technical Issue' || subject === 'Course Access Problem' || subject === 'Bug Report') {
            priority = 'High';
        } else if (subject === 'Content Quality' || subject === 'Certificate Issue' || subject === 'Feature Request') {
            priority = 'Medium';
        } else if (subject === 'General Inquiry' || subject === 'Other') {
            priority = 'Low';
        }

        const ticket = new Ticket({
            subject,
            description,
            createdBy: req.user.id,
            priority
        });

        await ticket.save();
        await ticket.populate('createdBy', 'name email role studentID');

        res.status(201).json({
            message: 'Ticket created successfully',
            ticket
        });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ message: 'Failed to create ticket', error: error.message });
    }
};

// @desc    Get user's tickets
// @route   GET /api/tickets/my
// @access  Staff, Student
exports.getMyTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ createdBy: req.user.id })
            .populate('createdBy', 'name email role studentID')
            .populate('replies.repliedBy', 'name role')
            .sort({ lastUpdated: -1 });

        res.status(200).json(tickets);
    } catch (error) {
        console.error('Get my tickets error:', error);
        res.status(500).json({ message: 'Failed to fetch tickets', error: error.message });
    }
};

// @desc    Get single ticket details
// @route   GET /api/tickets/:id
// @access  Staff, Student, Admin
exports.getTicketById = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate('createdBy', 'name email role studentID')
            .populate('replies.repliedBy', 'name role');

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Check if user has access to this ticket
        if (req.user.role !== 'Admin' && ticket.createdBy._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Mark as read by user if not admin
        if (req.user.role !== 'Admin' && !ticket.isReadByUser) {
            ticket.isReadByUser = true;
            await ticket.save();
        }

        res.status(200).json(ticket);
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ message: 'Failed to fetch ticket', error: error.message });
    }
};

// @desc    Add reply to ticket
// @route   POST /api/tickets/:id/reply
// @access  Staff, Student, Admin
exports.addReply = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Reply message is required' });
        }

        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Check if user has access to this ticket
        if (req.user.role !== 'Admin' && ticket.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const isAdminReply = req.user.role === 'Admin';

        ticket.replies.push({
            message,
            repliedBy: req.user.id,
            isAdminReply
        });

        ticket.lastUpdated = Date.now();

        // Mark as unread for the other party
        if (isAdminReply) {
            ticket.isReadByUser = false;
            ticket.status = 'In Progress'; // Auto-update status when admin replies
        } else {
            ticket.isReadByAdmin = false;
        }

        await ticket.save();
        await ticket.populate('createdBy', 'name email role studentID');
        await ticket.populate('replies.repliedBy', 'name role');

        res.status(200).json({
            message: 'Reply added successfully',
            ticket
        });
    } catch (error) {
        console.error('Add reply error:', error);
        res.status(500).json({ message: 'Failed to add reply', error: error.message });
    }
};

// ==================== ADMIN ROUTES ====================

// @desc    Get all tickets (Admin)
// @route   GET /api/tickets/admin/all
// @access  Admin
exports.getAllTickets = async (req, res) => {
    try {
        const { search, status, priority } = req.query;

        let query = {};

        // Search by ticket ID, subject, or user name
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const users = await User.find({ name: searchRegex }).select('_id');
            const userIds = users.map(u => u._id);

            query.$or = [
                { ticketID: searchRegex },
                { subject: searchRegex },
                { description: searchRegex },
                { createdBy: { $in: userIds } }
            ];
        }

        // Filter by status
        if (status && status !== 'All') {
            query.status = status;
        }

        // Filter by priority
        if (priority && priority !== 'All') {
            query.priority = priority;
        }

        const tickets = await Ticket.find(query)
            .populate('createdBy', 'name email role studentID')
            .populate('replies.repliedBy', 'name role')
            .sort({ lastUpdated: -1 });

        res.status(200).json(tickets);
    } catch (error) {
        console.error('Get all tickets error:', error);
        res.status(500).json({ message: 'Failed to fetch tickets', error: error.message });
    }
};

// @desc    Update ticket status (Admin)
// @route   PATCH /api/tickets/:id/status
// @access  Admin
exports.updateTicketStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { 
                status,
                lastUpdated: Date.now(),
                isReadByUser: false // Notify user of status change
            },
            { new: true }
        )
            .populate('createdBy', 'name email role studentID')
            .populate('replies.repliedBy', 'name role');

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        res.status(200).json({
            message: 'Ticket status updated',
            ticket
        });
    } catch (error) {
        console.error('Update ticket status error:', error);
        res.status(500).json({ message: 'Failed to update status', error: error.message });
    }
};

// @desc    Update ticket priority (Admin)
// @route   PATCH /api/tickets/:id/priority
// @access  Admin
exports.updateTicketPriority = async (req, res) => {
    try {
        const { priority } = req.body;

        if (!priority) {
            return res.status(400).json({ message: 'Priority is required' });
        }

        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { priority, lastUpdated: Date.now() },
            { new: true }
        )
            .populate('createdBy', 'name email role studentID')
            .populate('replies.repliedBy', 'name role');

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        res.status(200).json({
            message: 'Ticket priority updated',
            ticket
        });
    } catch (error) {
        console.error('Update ticket priority error:', error);
        res.status(500).json({ message: 'Failed to update priority', error: error.message });
    }
};

// @desc    Mark ticket as read by admin
// @route   PATCH /api/tickets/:id/mark-read
// @access  Admin
exports.markAsReadByAdmin = async (req, res) => {
    try {
        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { isReadByAdmin: true },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        res.status(200).json({ message: 'Ticket marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: 'Failed to mark as read', error: error.message });
    }
};

// @desc    Get unread tickets count (Admin)
// @route   GET /api/tickets/admin/unread-count
// @access  Admin
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Ticket.countDocuments({ isReadByAdmin: false });
        res.status(200).json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ message: 'Failed to get unread count', error: error.message });
    }
};

// @desc    Update all existing ticket priorities based on subject (one-time migration)
// @route   POST /api/tickets/admin/update-priorities
// @access  Admin
exports.updateAllPriorities = async (req, res) => {
    try {
        const tickets = await Ticket.find({});
        let updatedCount = 0;

        for (const ticket of tickets) {
            let newPriority = 'Medium'; // default
            
            if (ticket.subject === 'Payment Issue' || ticket.subject === 'Account Related') {
                newPriority = 'Urgent';
            } else if (ticket.subject === 'Technical Issue' || ticket.subject === 'Course Access Problem' || ticket.subject === 'Bug Report') {
                newPriority = 'High';
            } else if (ticket.subject === 'Content Quality' || ticket.subject === 'Certificate Issue' || ticket.subject === 'Feature Request') {
                newPriority = 'Medium';
            } else if (ticket.subject === 'General Inquiry' || ticket.subject === 'Other') {
                newPriority = 'Low';
            }

            if (ticket.priority !== newPriority) {
                ticket.priority = newPriority;
                ticket.lastUpdated = Date.now();
                await ticket.save();
                updatedCount++;
            }
        }

        res.status(200).json({
            message: 'Priorities updated successfully',
            totalTickets: tickets.length,
            updatedCount
        });
    } catch (error) {
        console.error('Update all priorities error:', error);
        res.status(500).json({ message: 'Failed to update priorities', error: error.message });
    }
};
