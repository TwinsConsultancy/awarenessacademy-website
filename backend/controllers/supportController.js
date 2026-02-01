const { Ticket } = require('../models/index');

exports.createTicket = async (req, res) => {
    try {
        const { subject, message } = req.body;
        const newTicket = new Ticket({
            studentID: req.user.id,
            subject,
            message
        });
        await newTicket.save();
        res.status(201).json({ message: 'Concern raised successfully.', ticket: newTicket });
    } catch (err) {
        res.status(500).json({ message: 'Failed to raise concern.', error: err.message });
    }
};

exports.getMyTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ studentID: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(tickets);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed.', error: err.message });
    }
};
