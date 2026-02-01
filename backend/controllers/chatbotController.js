const { User, Course, Schedule, FAQ, Ticket } = require('../models/index');

// Get Bot Response
exports.getBotResponse = async (req, res) => {
    try {
        const { message, email, phone } = req.body;
        const studentID = req.user ? req.user.id : null;
        let response = "";
        const msg = message.toLowerCase();

        // 1. Lead Generation for Guests
        if (!studentID && (msg.includes('join') || msg.includes('enroll') || msg.includes('price'))) {
            if (!email) {
                return res.status(200).json({
                    response: "To guide you better, could you please share your email? I'll send you our sanctuary brochure.",
                    requireEmail: true
                });
            }
        }

        // 2. Timetable Integration ("When is my next class?")
        if (msg.includes('class') || msg.includes('timetable') || msg.includes('schedule') || msg.includes('next')) {
            if (!studentID) {
                response = "Please login to see your personal cosmic schedule. Generally, our live flows happen daily at dawn.";
            } else {
                const now = new Date();
                const nextClass = await Schedule.findOne({ startTime: { $gt: now } })
                    .populate('courseID', 'title')
                    .sort({ startTime: 1 });

                if (nextClass) {
                    response = `Your next sacred flow is "${nextClass.title}" for the path "${nextClass.courseID.title}", starting on ${nextClass.startTime.toLocaleString()}.`;
                } else {
                    response = "You have no upcoming live sessions scheduled at the moment. Use this time for self-reflection.";
                }
            }
        }

        // 3. Course Discovery ("recommend", "find", "suggest")
        else if (msg.includes('recommend') || msg.includes('find') || msg.includes('course') || msg.includes('path')) {
            const courses = await Course.find({ status: 'Published' }).limit(2);
            const titles = courses.map(c => c.title).join(' and ');
            response = `I suggest exploring ${titles}. They are highly resonant with seekers right now. Shall I show you more in the Marketplace?`;
        }

        // 4. FAQ Database Integration
        else {
            const faq = await FAQ.findOne({ question: { $regex: msg, $options: 'i' } });
            if (faq) {
                response = faq.answer;
            } else {
                // Default responses
                if (msg.includes('hello') || msg.includes('hi')) {
                    response = "Greetings, seeker. How can I assist your spiritual growth today?";
                } else if (msg.includes('help')) {
                    response = "I can help you find courses, check your timetable, or answer technical questions. What is on your mind?";
                } else {
                    response = "That is an interesting realization. While I ponder on it, is there anything specific about the sanctuary I can help with?";
                }
            }
        }

        res.status(200).json({ response });

    } catch (err) {
        res.status(500).json({ message: 'The oracle is currently silent.', error: err.message });
    }
};
