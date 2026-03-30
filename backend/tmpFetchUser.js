const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ role: 'patient' }).exec();
        console.log('FOUND:', user ? user._id.toString() : 'NONE');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
};
run();
