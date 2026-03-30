const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const Patient = require('../models/Patient');
const { protect } = require('../middleware/authMiddleware');

// Lazy Twilio client — avoids crash on startup with placeholder credentials
const getTwilioClient = () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    return (sid && token && sid.startsWith('AC')) ? twilio(sid, token) : null;
};

/**
 * POST /api/sos/trigger
 * Manual SOS trigger from patient — sends SMS to emergency contact immediately.
 * Protected: patient must be logged in.
 */
router.post('/trigger', protect, async (req, res) => {
    try {
        const patient = await Patient.findOne({ userId: req.user.id }).populate('userId');
        if (!patient) {
            return res.status(404).json({ message: 'Patient profile not found' });
        }

        const patientName = patient.userId.name;
        const contactName = patient.emergencyContactName || 'Emergency Contact';
        const contactPhone = patient.emergencyContactPhone;

        if (!contactPhone) {
            return res.status(400).json({ message: 'No emergency contact phone number on file.' });
        }

        const smsBody = `🚨 URGENT SOS from HealthConnect: ${patientName} has manually triggered an emergency alert. Please contact them or call emergency services immediately.`;

        // Notify via Socket.io to all admins/doctors
        const io = req.app.get('io');
        if (io) {
            io.to('admin_and_doctors').emit('sos_triggered', {
                patientName,
                patientUserId: req.user.id,
                message: `Manual SOS triggered by ${patientName}`,
                timestamp: new Date()
            });
        }

        // Send Twilio SMS
        const twilioClient = getTwilioClient();
        if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
            await twilioClient.messages.create({
                body: smsBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: contactPhone
            });
            console.log(`Manual SOS SMS sent to ${contactName} (${contactPhone})`);
        } else {
            console.warn('Twilio not configured — SMS not sent. SOS was logged and socket broadcast.');
        }

        res.json({
            success: true,
            message: `SOS alert sent to ${contactName}`,
            smsSent: !!(twilioClient && process.env.TWILIO_PHONE_NUMBER)
        });
    } catch (error) {
        console.error('SOS trigger error:', error);
        res.status(500).json({ message: 'Failed to trigger SOS alert' });
    }
});

module.exports = router;
