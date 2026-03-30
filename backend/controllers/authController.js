const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};

exports.registerPatient = async (req, res) => {
    try {
        const { name, email, password, phone, age, gender, emergencyContactName, emergencyContactPhone, verificationCode } = req.body;

        // --- Verification Code Check ---
        if (!verificationCode || verificationCode !== process.env.PATIENT_VERIFY_CODE) {
            return res.status(400).json({ message: 'Invalid or missing patient verification code.' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'patient'
        });

        const patient = await Patient.create({
            userId: user._id,
            age,
            gender,
            emergencyContactName,
            emergencyContactPhone
        });

        const token = generateToken(user._id, user.role);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            patientDetails: patient,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.registerDoctor = async (req, res) => {
    try {
        const { name, email, password, phone, specialization, licenseId, verificationCode } = req.body;

        // --- Verification Code Check ---
        if (!verificationCode || verificationCode !== process.env.DOCTOR_VERIFY_CODE) {
            return res.status(400).json({ message: 'Invalid or missing doctor verification code.' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'doctor'
        });

        const doctor = await Doctor.create({
            userId: user._id,
            specialization,
            licenseId
        });

        const token = generateToken(user._id, user.role);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            doctorDetails: doctor,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {

            // Validate that the user is logging in with their correct role
            if (role && user.role !== role && user.role !== 'admin') {
                return res.status(401).json({ message: 'Invalid role for this account' });
            }

            let extraDetails = {};
            if (user.role === 'patient') {
                extraDetails = await Patient.findOne({ userId: user._id });
            } else if (user.role === 'doctor') {
                extraDetails = await Doctor.findOne({ userId: user._id });
            }

            const token = generateToken(user._id, user.role);

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                details: extraDetails,
                token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.registerAdmin = async (req, res) => {
    try {
        const { name, email, password, phone, verificationCode } = req.body;

        // --- Verification Code Check ---
        if (!verificationCode || verificationCode !== process.env.ADMIN_VERIFY_CODE) {
            return res.status(400).json({ message: 'Invalid or missing admin verification code.' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'admin'
        });

        const token = generateToken(user._id, user.role);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
