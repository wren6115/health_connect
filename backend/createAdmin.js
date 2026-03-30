/**
 * Run this ONCE to create an admin user in the database.
 * Usage: node createAdmin.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');

const ADMIN_NAME = 'Admin User';
const ADMIN_EMAIL = 'admin@healthconnect.com';
const ADMIN_PASSWORD = 'admin123456'; // Change this!
const ADMIN_PHONE = '0000000000';

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB...');

        const existing = await User.findOne({ email: ADMIN_EMAIL });
        if (existing) {
            console.log('Admin already exists:', existing.email);
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

        const admin = await User.create({
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            password: hashedPassword,
            role: 'admin',
            phone: ADMIN_PHONE
        });

        console.log('✅ Admin created successfully!');
        console.log('   Email:   ', ADMIN_EMAIL);
        console.log('   Password:', ADMIN_PASSWORD);
        console.log('   ID:      ', admin._id.toString());
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

run();
