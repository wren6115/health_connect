const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const mongoose = require('mongoose');
const {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createAppointment)
    .get(protect, getAppointments);

router.route('/:id')
    .get(protect, getAppointmentById);

router.route('/:id/status')
    .put(protect, authorize('admin', 'doctor'), updateAppointmentStatus);

// GET /api/appointments/by-doctor/:doctorId — admin/doctor view of a specific doctor's appointments
router.get('/by-doctor/:doctorId', protect, authorize('admin', 'doctor'), async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { status, from, to, limit = 50 } = req.query;
        const query = { doctor: doctorId };
        if (status) query.status = status;
        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to);
        }
        const appointments = await Appointment.find(query)
            .populate('patient', 'name email')
            .sort({ date: -1 })
            .limit(parseInt(limit));
        res.json({ success: true, appointments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/appointments/by-patient/:patientId — administrator/doctor gets all appointments for a patient
router.get('/by-patient/:patientId', protect, authorize('admin', 'doctor'), async (req, res) => {
    try {
        const appointments = await Appointment.find({ patient: req.params.patientId })
            .populate('doctor', 'name email specialization')
            .sort({ date: -1 });
        res.json({ success: true, appointments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
