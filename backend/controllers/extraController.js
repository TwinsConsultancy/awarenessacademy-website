const { Blog, Event, Newsletter } = require('../models/index');

// Blog Controllers
exports.getBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.status(200).json(blogs);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch blogs' });
    }
};

exports.getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found' });
        res.status(200).json(blog);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch blog' });
    }
};

exports.createBlog = async (req, res) => {
    try {
        const blog = new Blog(req.body);
        await blog.save();
        res.status(201).json(blog);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create blog' });
    }
};

// Event Controllers
exports.getEvents = async (req, res) => {
    try {
        const events = await Event.find({ active: true }).sort({ date: 1 });
        res.status(200).json(events);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch events' });
    }
};

exports.createEvent = async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();
        res.status(201).json(event);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create event' });
    }
};

// Newsletter Controller
exports.subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;
        const sub = new Newsletter({ email });
        await sub.save();
        res.status(201).json({ message: 'Success! You are now part of the Inner Circle.' });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'You are already subscribed.' });
        res.status(500).json({ message: 'Subscription failed' });
    }
};
