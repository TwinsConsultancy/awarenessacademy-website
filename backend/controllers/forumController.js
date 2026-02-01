const { Forum } = require('../models/index');

exports.addComment = async (req, res) => {
    try {
        const { courseID, comment } = req.body;
        const newPost = new Forum({
            courseID,
            studentID: req.user.id,
            comment
        });
        await newPost.save();
        res.status(201).json({ message: 'Comment shared in the sanctuary.', post: newPost });
    } catch (err) {
        res.status(500).json({ message: 'Failed to share comment.', error: err.message });
    }
};

exports.getCourseForum = async (req, res) => {
    try {
        const posts = await Forum.find({ courseID: req.params.courseID })
            .populate('studentID', 'name profilePic')
            .sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed.', error: err.message });
    }
};
