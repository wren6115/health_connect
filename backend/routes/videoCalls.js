const express = require('express');
const router = express.Router();
const { createVideoSession, getVideoSessionByAppointment } = require('../controllers/videoSessionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('admin', 'doctor'), createVideoSession);

router.route('/appointment/:appointmentId')
    .get(protect, getVideoSessionByAppointment);

module.exports = router;
