const { ContactMessage } = require('../models');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Submit a new contact message
 * POST /api/contact
 */
exports.submitContactMessage = catchAsync(async (req, res, next) => {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
        return next(new AppError('All fields are required', 400));
    }

    // Validate name (2-100 characters, letters and spaces only)
    if (name.length < 2 || name.length > 100 || !/^[a-zA-Z\s]+$/.test(name)) {
        return next(new AppError('Name must be 2-100 characters and contain only letters and spaces', 400));
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return next(new AppError('Please provide a valid email address', 400));
    }

    // Validate subject (5-200 characters)
    if (subject.length < 5 || subject.length > 200) {
        return next(new AppError('Subject must be 5-200 characters', 400));
    }

    // Validate message (10-2000 characters)
    if (message.length < 10 || message.length > 2000) {
        return next(new AppError('Message must be 10-2000 characters', 400));
    }

    // Capture IP and User Agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';

    // Auto-assign priority based on keywords
    let priority = 'Medium';
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'immediately'];
    const highKeywords = ['important', 'problem', 'issue', 'help', 'support'];
    
    const combinedText = `${subject} ${message}`.toLowerCase();
    if (urgentKeywords.some(keyword => combinedText.includes(keyword))) {
        priority = 'Urgent';
    } else if (highKeywords.some(keyword => combinedText.includes(keyword))) {
        priority = 'High';
    }

    // Create contact message
    const contactMessage = await ContactMessage.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        subject: subject.trim(),
        message: message.trim(),
        priority,
        ipAddress,
        userAgent
    });

    res.status(201).json({
        status: 'success',
        message: 'Thank you for contacting us! We will get back to you shortly.',
        data: {
            id: contactMessage._id,
            createdAt: contactMessage.createdAt
        }
    });
});

/**
 * Get all contact messages (Admin only)
 * GET /api/contact/admin
 */
exports.getAllMessages = catchAsync(async (req, res, next) => {
    const { status, priority, search, sortBy, limit, page } = req.query;

    // Build query
    const query = {};
    
    if (status) {
        query.status = status;
    }
    
    if (priority) {
        query.priority = priority;
    }
    
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { subject: { $regex: search, $options: 'i' } },
            { message: { $regex: search, $options: 'i' } }
        ];
    }

    // Sorting
    let sort = '-createdAt'; // Default: newest first
    if (sortBy === 'oldest') sort = 'createdAt';
    else if (sortBy === 'priority') sort = '-priority -createdAt';
    else if (sortBy === 'name') sort = 'name';

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    const messages = await ContactMessage.find(query)
        .populate('repliedBy', 'name email')
        .sort(sort)
        .limit(limitNum)
        .skip(skip);

    const total = await ContactMessage.countDocuments(query);

    // Get stats
    const stats = await ContactMessage.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const statusCounts = {
        New: 0,
        Read: 0,
        Replied: 0,
        Archived: 0
    };

    stats.forEach(stat => {
        statusCounts[stat._id] = stat.count;
    });

    res.json({
        status: 'success',
        results: messages.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        stats: statusCounts,
        data: messages
    });
});

/**
 * Get single contact message (Admin only)
 * GET /api/contact/admin/:id
 */
exports.getMessage = catchAsync(async (req, res, next) => {
    const message = await ContactMessage.findById(req.params.id)
        .populate('repliedBy', 'name email');

    if (!message) {
        return next(new AppError('Message not found', 404));
    }

    // Mark as read if it's new
    if (message.status === 'New') {
        message.status = 'Read';
        await message.save();
    }

    res.json({
        status: 'success',
        data: message
    });
});

/**
 * Update contact message status/notes (Admin only)
 * PATCH /api/contact/admin/:id
 */
exports.updateMessage = catchAsync(async (req, res, next) => {
    const { status, priority, adminNotes } = req.body;
    const userId = req.user._id;

    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
        return next(new AppError('Message not found', 404));
    }

    // Update fields
    if (status) message.status = status;
    if (priority) message.priority = priority;
    if (adminNotes !== undefined) message.adminNotes = adminNotes;

    // Track when replied
    if (status === 'Replied' && message.status !== 'Replied') {
        message.repliedAt = new Date();
        message.repliedBy = userId;
    }

    await message.save();

    res.json({
        status: 'success',
        message: 'Message updated successfully',
        data: message
    });
});

/**
 * Delete contact message (Admin only)
 * DELETE /api/contact/admin/:id
 */
exports.deleteMessage = catchAsync(async (req, res, next) => {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);

    if (!message) {
        return next(new AppError('Message not found', 404));
    }

    res.json({
        status: 'success',
        message: 'Message deleted successfully'
    });
});

/**
 * Get message statistics (Admin only)
 * GET /api/contact/admin/stats
 */
exports.getStats = catchAsync(async (req, res, next) => {
    const stats = await ContactMessage.aggregate([
        {
            $facet: {
                byStatus: [
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 }
                        }
                    }
                ],
                byPriority: [
                    {
                        $group: {
                            _id: '$priority',
                            count: { $sum: 1 }
                        }
                    }
                ],
                recentTrend: [
                    {
                        $match: {
                            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
                        }
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                total: [
                    {
                        $count: 'count'
                    }
                ]
            }
        }
    ]);

    res.json({
        status: 'success',
        data: stats[0]
    });
});
