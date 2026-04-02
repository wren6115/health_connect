const User = require('../models/User');
const Patient = require('../models/Patient');
const DoctorProfile = require('../models/DoctorProfile');
const HealthReading = require('../models/HealthReading');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            await user.deleteOne();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Approve user (Admin only)
// @route   PUT /api/users/:id/approve
// @access  Private/Admin
const approveUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.status = 'approved';
            await user.save();
            res.json({ message: 'User approved', user });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reject user (Admin only)
// @route   PUT /api/users/:id/reject
// @access  Private/Admin
const rejectUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.status = 'rejected';
            await user.save();
            res.json({ message: 'User rejected', user });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user by ID with full profile (patient or doctor profile merged)
// @route   GET /api/users/:id/full
// @access  Private/Admin or self
const getUserFull = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        let profile = null;
        let lastReading = null;
        if (user.role === 'patient') {
            profile = await Patient.findOne({ userId: user._id }).populate('doctorId', 'name email');
            if (profile) {
                lastReading = await HealthReading.findOne({ patientId: profile._id })
                    .sort({ timestamp: -1 });
            }
        } else if (user.role === 'doctor') {
            profile = await DoctorProfile.findOne({ user: user._id });
        }

        res.json({ user, profile, lastReading });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Assign doctor to patient (Admin only)
// @route   PUT /api/users/:id/assign-doctor
// @access  Private/Admin
const assignDoctor = async (req, res) => {
    try {
        const { doctorId } = req.body;
        const patient = await Patient.findOne({ userId: req.params.id });
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        patient.doctorId = doctorId;
        await patient.save();
        res.json({ message: 'Doctor assigned successfully', patient });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getUsers,
    getUserById,
    deleteUser,
    approveUser,
    rejectUser,
    getUserFull,
    assignDoctor
};
