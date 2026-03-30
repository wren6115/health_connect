const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer = null;

const connectDB = async () => {
    try {
        // Try to connect to primary MongoDB first (short timeout)
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 3000
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(`Failed to connect to primary MongoDB. Falling back to In-Memory MongoDB for development...`);
        try {
            mongoServer = await MongoMemoryServer.create();
            const uri = mongoServer.getUri();
            await mongoose.connect(uri);
            console.log(`In-Memory MongoDB Connected! (on server restart)ed on server rest`);

            // Auto-seed the in-memory database on startup
            await seedDatabase();
        } catch (memError) {
            console.error(`Error connecting to In-Memory MongoDB: ${memError.message}`);
            process.exit(1);
        }
    }
};

const seedDatabase = async () => {
    try {
        const User = require('../models/User');
        const DoctorProfile = require('../models/DoctorProfile');

        // Only seed if no users exist yet
        const count = await User.countDocuments();
        if (count > 0) {
            console.log(`Database already has ${count} users — skipping seed.`);
            return;
        }

        console.log('Auto-seeding database with demo data...');
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password123!', salt);

        // Create Admin
        await User.create({ name: 'System Admin', email: 'admin@healthconnect.com', password: hashedPassword, role: 'admin' });

        // Create 5 Doctors with profiles
        const doctorsData = [
            { name: 'Dr. Sarah Johnson', email: 'sarah.johnson@healthconnect.com', specialization: 'Cardiology', experience: 15, consultationFee: 150, bio: 'Expert in cardiovascular diseases and preventive cardiology.', education: 'MD, Harvard Medical School', rating: 4.9, reviewCount: 234, availableSlots: ['Mon 9AM-12PM', 'Wed 2PM-5PM', 'Fri 10AM-1PM'], isAvailableToday: true },
            { name: 'Dr. Michael Chen', email: 'michael.chen@healthconnect.com', specialization: 'Dermatology', experience: 12, consultationFee: 120, bio: 'Expert in skin conditions, cosmetic dermatology, and skin cancer prevention.', education: 'MD, Johns Hopkins University', rating: 4.8, reviewCount: 189, availableSlots: ['Tue 10AM-1PM', 'Thu 3PM-6PM'], isAvailableToday: false },
            { name: 'Dr. Emily Rodriguez', email: 'emily.rodriguez@healthconnect.com', specialization: 'Pediatrics', experience: 10, consultationFee: 130, bio: 'Compassionate pediatric care for children of all ages.', education: 'MD, Stanford University', rating: 5.0, reviewCount: 312, availableSlots: ['Mon 8AM-11AM', 'Tue 1PM-4PM', 'Thu 9AM-12PM'], isAvailableToday: true },
            { name: 'Dr. James Wilson', email: 'james.wilson@healthconnect.com', specialization: 'Orthopedics', experience: 18, consultationFee: 180, bio: 'Specializing in sports medicine and joint replacement surgery.', education: 'MD, Yale School of Medicine', rating: 4.7, reviewCount: 276, availableSlots: ['Mon 2PM-5PM', 'Wed 9AM-12PM', 'Fri 2PM-5PM'], isAvailableToday: true },
            { name: 'Dr. Priya Patel', email: 'priya.patel@healthconnect.com', specialization: 'Neurology', experience: 14, consultationFee: 200, bio: "Expert in neurological disorders including epilepsy and Parkinson's disease.", education: 'MD, Columbia University', rating: 4.9, reviewCount: 198, availableSlots: ['Tue 9AM-12PM', 'Thu 2PM-5PM'], isAvailableToday: false },
        ];

        for (const d of doctorsData) {
            const userDoc = await User.create({ name: d.name, email: d.email, password: hashedPassword, role: 'doctor', specialization: d.specialization });
            await DoctorProfile.create({ user: userDoc._id, specialization: d.specialization, experience: d.experience, consultationFee: d.consultationFee, bio: d.bio, education: d.education, rating: d.rating, reviewCount: d.reviewCount, availableSlots: d.availableSlots, isAvailableToday: d.isAvailableToday });
        }

        // Create 3 Patients
        const patients = [
            { name: 'John Doe', email: 'john.doe@example.com' },
            { name: 'Jane Smith', email: 'jane.smith@example.com' },
            { name: 'Robert Brown', email: 'robert.brown@example.com' },
        ];
        for (const p of patients) {
            await User.create({ name: p.name, email: p.email, password: hashedPassword, role: 'patient' });
        }

        console.log('✅ Auto-seed complete! 1 admin, 5 doctors, 3 patients created.');
        console.log('   All passwords: Password123!');
        console.log('   Patient login: john.doe@example.com');
        console.log('   Doctor login:  sarah.johnson@healthconnect.com');
        console.log('   Admin login:   admin@healthconnect.com');
    } catch (err) {
        console.error('Auto-seed error:', err.message);
    }
};

module.exports = connectDB;
