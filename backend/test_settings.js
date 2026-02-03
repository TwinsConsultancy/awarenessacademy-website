const mongoose = require('mongoose');
const Settings = require('./models/Settings');

console.log('Settings Import:', Settings);
console.log('Is Function?', typeof Settings === 'function');
console.log('Has findOne?', Settings && typeof Settings.findOne === 'function');

mongoose.connect('mongodb://localhost:27017/test_db', { useNewUrlParser: true, useUnifiedTopology: true }) // Using dummy DB to test import, won't save
    .then(() => {
        console.log('DB Connected');
        if (typeof Settings.findOne === 'function') {
            console.log('Settings.findOne is available');
        } else {
            console.log('Settings.findOne is MISSING');
        }
        process.exit();
    })
    .catch(err => {
        console.error('DB Connection Error:', err);
        process.exit();
    });
