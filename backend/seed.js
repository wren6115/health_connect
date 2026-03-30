/**
 * HealthConnect Database Seed Script
 * ------------------------------------
 * Creates: 1 Admin, 5 Doctors (with profiles), 3 Patients
 *
 * Run with:  node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('./models/User');
const DoctorProfile = require('./models/DoctorProfile');
const Appointment = require('./models/Appointment');
const Transaction = require('./models/Transaction');

const DOCTOR_DATA = [
    {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@healthconnect.com',
        specialization: 'Cardiology',
        experience: 15,
        consultationFee: 150,
        bio: 'Specialized in cardiovascular diseases, heart failure management, and preventive cardiology. Published author of 40+ research papers.',
        education: 'MD, Harvard Medical School',
        languages: ['English', 'Spanish'],
        rating: 4.9,
        reviewCount: 234,
        availableSlots: ['Mon 9AM-12PM', 'Wed 2PM-5PM', 'Fri 10AM-1PM'],
        isAvailableToday: true
    },
    {
        name: 'Dr. Michael Chen',
        email: 'michael.chen@healthconnect.com',
        specialization: 'Dermatology',
        experience: 12,
        consultationFee: 120,
        bio: 'Expert in skin conditions, cosmetic dermatology, and skin cancer prevention. Trained at Johns Hopkins.',
        education: 'MD, Johns Hopkins University',
        languages: ['English', 'Mandarin'],
        rating: 4.8,
        reviewCount: 189,
        availableSlots: ['Tue 10AM-1PM', 'Thu 3PM-6PM'],
        isAvailableToday: false
    },
    {
        name: 'Dr. Emily Rodriguez',
        email: 'emily.rodriguez@healthconnect.com',
        specialization: 'Pediatrics',
        experience: 10,
        consultationFee: 130,
        bio: 'Compassionate pediatric care for children of all ages. Specialist in childhood immunology and developmental disorders.',
        education: 'MD, Stanford University',
        languages: ['English', 'Spanish'],
        rating: 5.0,
        reviewCount: 312,
        availableSlots: ['Mon 8AM-11AM', 'Tue 1PM-4PM', 'Thu 9AM-12PM'],
        isAvailableToday: true
    },
    {
        name: 'Dr. James Wilson',
        email: 'james.wilson@healthconnect.com',
        specialization: 'Orthopedics',
        experience: 18,
        consultationFee: 180,
        bio: 'Specializing in sports medicine, joint replacement surgery, and spinal disorders. Former team physician for professional athletes.',
        education: 'MD, Yale School of Medicine',
        languages: ['English'],
        rating: 4.7,
        reviewCount: 276,
        availableSlots: ['Mon 2PM-5PM', 'Wed 9AM-12PM', 'Fri 2PM-5PM'],
        isAvailableToday: true
    },
    {
        name: 'Dr. Priya Patel',
        email: 'priya.patel@healthconnect.com',
        specialization: 'Neurology',
        experience: 14,
        consultationFee: 200,
        bio: 'Expert in neurological disorders including epilepsy, migraines, Parkinson\'s disease, and multiple sclerosis. Award-winning researcher.',
        education: 'MD, Columbia University',
        languages: ['English', 'Hindi', 'Gujarati'],
        rating: 4.9,
        reviewCount: 198,
        availableSlots: ['Tue 9AM-12PM', 'Thu 2PM-5PM'],
        isAvailableToday: false
    }
];

const PATIENT_DATA = [
    { name: 'John Doe', email: 'john.doe@example.com' },
    { name: 'Jane Smith', email: 'jane.smith@example.com' },
    { name: 'Robert Brown', email: 'robert.brown@example.com' }
];

const runSeed = async () => {
    let mongoServer;

    try {
        // Try to connect to existing MongoDB first
        let uri = process.env.MONGODB_URI;
        try {
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
            console.log('✅ Connected to MongoDB');
        } catch {
            console.log('⚠️  Local MongoDB not found — using In-Memory MongoDB for seeding');
            mongoServer = await MongoMemoryServer.create();
            uri = mongoServer.getUri();
            await mongoose.connect(uri);
            console.log('✅ Connected to In-Memory MongoDB');
            console.log('⚠️  NOTE: In-memory data is temporary! Install MongoDB for persistent data.');
        }

        // Clear existing data
        console.log('\n🗑️  Clearing existing users and profiles...');
        await User.deleteMany({});
        await DoctorProfile.deleteMany({});
        await Appointment.deleteMany({});
        await Transaction.deleteMany({});

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password123!', salt);

        // Create Admin
        console.log('\n👑 Seeding Admin...');
        await User.create({
            name: 'System Admin',
            email: 'admin@healthconnect.com',
            password: hashedPassword,
            role: 'admin'
        });
        console.log('   ✓ admin@healthconnect.com / Password123!');

        // Create Doctors + Profiles
        console.log('\n👨‍⚕️ Seeding Doctors...');
        for (const doctorData of DOCTOR_DATA) {
            const { specialization, experience, consultationFee, bio, education, languages, rating, reviewCount, availableSlots, isAvailableToday, ...userData } = doctorData;

            const doctorUser = await User.create({
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                role: 'doctor',
                specialization
            });

            await DoctorProfile.create({
                user: doctorUser._id,
                specialization,
                experience,
                consultationFee,
                bio,
                education,
                languages,
                rating,
                reviewCount,
                availableSlots,
                isAvailableToday
            });

            console.log(`   ✓ ${userData.email} (${specialization}) - Fee: $${consultationFee}`);
        }

        // Create Patients
        console.log('\n🧑 Seeding Patients...');
        for (const patientData of PATIENT_DATA) {
            await User.create({
                name: patientData.name,
                email: patientData.email,
                password: hashedPassword,
                role: 'patient'
            });
            console.log(`   ✓ ${patientData.email}`);
        }

        console.log('\n✅ Seeding Complete!');
        console.log('='.repeat(50));
        console.log('LOGIN CREDENTIALS (all use Password123!):');
        console.log('  Admin:   admin@healthconnect.com');
        console.log('  Doctor:  sarah.johnson@healthconnect.com');
        console.log('  Doctor:  michael.chen@healthconnect.com');
        console.log('  Doctor:  emily.rodriguez@healthconnect.com');
        console.log('  Doctor:  james.wilson@healthconnect.com');
        console.log('  Doctor:  priya.patel@healthconnect.com');
        console.log('  Patient: john.doe@example.com');
        console.log('  Patient: jane.smith@example.com');
        console.log('  Patient: robert.brown@example.com');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Seeding Failed:', error);
    } finally {
        await mongoose.disconnect();
        if (mongoServer) await mongoServer.stop();
        process.exit(0);
    }
};

runSeed();
