const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Create new appointment + process mock payment
// @route   POST /api/appointments
// @access  Private (Patient)
const createAppointment = async (req, res) => {
    try {
        const { doctor, date, timeSlot, reason, symptoms, notes } = req.body;

        // Get doctor's consultation fee from their profile
        const doctorProfile = await DoctorProfile.findOne({ user: doctor });
        const consultationFee = doctorProfile ? doctorProfile.consultationFee : 100;

        // Create appointment
        const appointment = new Appointment({
            patient: req.user._id,
            doctor,
            date,
            timeSlot: timeSlot || '',
            reason,
            symptoms: symptoms || [],
            notes: notes || '',
            consultationFee,
            paymentStatus: 'paid'  // mock payment - always succeeds
        });

        const createdAppointment = await appointment.save();

        // Create Transaction record (mock payment success)
        const platformFeePercent = 10;
        const platformFee = Math.round(consultationFee * (platformFeePercent / 100) * 100) / 100;
        const doctorEarning = Math.round((consultationFee - platformFee) * 100) / 100;

        await Transaction.create({
            appointment: createdAppointment._id,
            patient: req.user._id,
            doctor,
            amount: consultationFee,
            platformFeePercent,
            platformFee,
            doctorEarning,
            status: 'success',
            paymentMethod: 'mock_card'
        });

        // Notify doctor
        await Notification.create({
            recipient: doctor,
            type: 'appointment',
            message: `New appointment booked by ${req.user.name} on ${new Date(date).toLocaleDateString()}`,
            relatedItem: { itemType: 'Appointment', itemId: createdAppointment._id }
        });

        res.status(201).json(createdAppointment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    Get all appointments (role-based)
// @route   GET /api/appointments
// @access  Private
const getAppointments = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'patient') query.patient = req.user._id;
        else if (req.user.role === 'doctor') query.doctor = req.user._id;
        // admin sees all

        const appointments = await Appointment.find(query)
            .populate('patient', 'name email')
            .populate('doctor', 'name email specialization')
            .sort({ date: 1 });

        res.json(appointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
const getAppointmentById = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patient', 'name email')
            .populate('doctor', 'name email specialization');

        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        if (req.user.role !== 'admin' &&
            appointment.patient._id.toString() !== req.user._id.toString() &&
            appointment.doctor._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(appointment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private (Doctor/Admin)
const updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        appointment.status = status;
        const updated = await appointment.save();

        await Notification.create({
            recipient: appointment.patient,
            type: 'appointment',
            message: `Your appointment has been ${status}`,
            relatedItem: { itemType: 'Appointment', itemId: appointment._id }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { createAppointment, getAppointments, getAppointmentById, updateAppointmentStatus };
