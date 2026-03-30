const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/doctors
// @desc    Get all doctors (with profile data)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { specialty, minRating } = req.query;

        // Find all users with role=doctor
        let userQuery = { role: 'doctor' };
        const doctorUsers = await User.find(userQuery).select('-password');

        // Get all profiles
        let profileQuery = {};
        if (specialty && specialty !== 'all') {
            profileQuery.specialization = { $regex: specialty, $options: 'i' };
        }
        if (minRating) {
            profileQuery.rating = { $gte: parseFloat(minRating) };
        }

        const profiles = await DoctorProfile.find(profileQuery).populate('user', 'name email');

        // Merge user info into profile response
        const doctors = profiles.map(profile => ({
            _id: profile.user._id,
            profileId: profile._id,
            name: profile.user.name,
            email: profile.user.email,
            specialization: profile.specialization,
            experience: profile.experience,
            consultationFee: profile.consultationFee,
            bio: profile.bio,
            education: profile.education,
            languages: profile.languages,
            rating: profile.rating,
            reviewCount: profile.reviewCount,
            availableSlots: profile.availableSlots,
            isAvailableToday: profile.isAvailableToday
        }));

        res.json({ status: 'success', results: doctors.length, data: doctors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// @route   GET /api/doctors/specialties
// @desc    Get all unique specializations
// @access  Public
router.get('/meta/specialties', async (req, res) => {
    try {
        const specialties = await DoctorProfile.distinct('specialization');
        res.json({ status: 'success', data: specialties });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// @route   GET /api/doctors/:id
// @desc    Get doctor by user ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const profile = await DoctorProfile.findOne({ user: req.params.id }).populate('user', 'name email');
        if (!profile) return res.status(404).json({ status: 'error', message: 'Doctor not found' });

        res.json({
            status: 'success',
            data: {
                _id: profile.user._id,
                profileId: profile._id,
                name: profile.user.name,
                email: profile.user.email,
                specialization: profile.specialization,
                experience: profile.experience,
                consultationFee: profile.consultationFee,
                bio: profile.bio,
                education: profile.education,
                languages: profile.languages,
                rating: profile.rating,
                reviewCount: profile.reviewCount,
                availableSlots: profile.availableSlots,
                isAvailableToday: profile.isAvailableToday
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
