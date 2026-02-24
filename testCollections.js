const mongoose = require('mongoose');
const { Ticket, Feedback, ContactMessage } = require('./backend/models');

require('dotenv').config({ path: './backend/.env' });

async function run() {
    await mongoose.connect(process.env.MONGODB_URL);

    const tickets = await Ticket.find({});
    console.log("Tickets: ", tickets.length);
    console.log("Ticket Statuses: ", new Set(tickets.map(t => t.status)));

    const feedbacks = await Feedback.find({});
    console.log("Feedbacks: ", feedbacks.length);

    const contacts = await ContactMessage.find({});
    console.log("ContactMessages: ", contacts.length);
    console.log("ContactMessage Statuses: ", new Set(contacts.map(c => c.status)));

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
