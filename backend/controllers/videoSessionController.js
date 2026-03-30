const VideoSession = require('../models/VideoSession');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');

// @desc    Create a video session for an appointment
// @route   POST /api/video-calls
// @access  Private (Doctor/Admin)
const createVideoSession = async (req, res) => {
    try {
        const { appointmentId, meetingLink } = req.body;

        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const session = new VideoSession({
            appointment: appointmentId,
            meetingLink
        });

        const createdSession = await session.save();

        // Notify patient
        await Notification.create({
            recipient: appointment.patient,
            type: 'appointment',
            message: `A video link has been added to your appointment on ${new Date(appointment.date).toLocaleDateString()}`,
            relatedItem: {
                itemType: 'Appointment',
                itemId: appointment._id
            }
        });

        res.status(201).json(createdSession);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get video session by appointment ID
// @route   GET /api/video-calls/appointment/:appointmentId
// @access  Private
const getVideoSessionByAppointment = async (req, res) => {
    try {
        const session = await VideoSession.findOne({ appointment: req.params.appointmentId })
            .populate('appointment');

        if (session) {
            // Verify access
            const isPatient = session.appointment.patient.toString() === req.user._id.toString();
            const isDoctor = session.appointment.doctor.toString() === req.user._id.toString();
            const isAdmin = req.user.role === 'admin';

            if (!isPatient && !isDoctor && !isAdmin) {
                return res.status(403).json({ message: 'Not authorized to view this video session' });
            }

            res.json(session);
        } else {
            res.status(404).json({ message: 'Video session not found for this appointment' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createVideoSession,
    getVideoSessionByAppointment
};
