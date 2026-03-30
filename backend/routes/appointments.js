const express = require('express');
const router = express.Router();
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

module.exports = router;
