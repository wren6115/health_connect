const PatientFeedback = require('../models/PatientFeedback');
const Alert = require('../models/Alert');
const Notification = require('../models/Notification');
const Patient = require('../models/Patient');

// How far back (in ms) to look for "No" responses before escalating
const ESCALATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const NO_RESPONSE_ESCALATION_THRESHOLD = 3;   // Escalate after 3× "No"

// @desc    Patient responds to "Are you okay?" prompt
// @route   POST /api/feedback/respond
// @access  Private (Patient)
const respondToAlert = async (req, res) => {
    try {
        const { alertId, response, vitalsSnapshot } = req.body;

        if (!alertId || !response) {
            return res.status(400).json({ message: 'alertId and response (yes/no) are required.' });
        }
        if (!['yes', 'no'].includes(response.toLowerCase())) {
            return res.status(400).json({ message: 'response must be "yes" or "no".' });
        }

        // Verify alert exists
        const alert = await Alert.findById(alertId);
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found.' });
        }

        // Save feedback
        const feedback = await PatientFeedback.create({
            alertId,
            patientUserId: req.user._id,
            response: response.toLowerCase(),
            vitalsSnapshot: vitalsSnapshot || {}
        });

        // Mark alert as responded
        await Alert.findByIdAndUpdate(alertId, { feedbackReceived: true });

        const io = req.app.get('io');

        // --- Escalation Check ---
        if (response.toLowerCase() === 'no') {
            const windowStart = new Date(Date.now() - ESCALATION_WINDOW_MS);

            const recentNoResponses = await PatientFeedback.countDocuments({
                patientUserId: req.user._id,
                response: 'no',
                timestamp: { $gte: windowStart }
            });

            if (recentNoResponses >= NO_RESPONSE_ESCALATION_THRESHOLD) {
                // Find the patient's assigned doctor (if any) for a targeted notification
                const patient = await Patient.findOne({ userId: req.user._id });
                const doctorUserId = patient?.doctorId || null;

                // Create an escalation notification in the DB
                const notifMessage = `🚨 ESCALATION: Patient ${req.user.name} has responded "No" to ${recentNoResponses} consecutive health alerts in the last hour. Immediate attention required!`;

                if (doctorUserId) {
                    await Notification.create({
                        recipient: doctorUserId,
                        type: 'sos',
                        message: notifMessage,
                        relatedItem: { itemType: 'Alert', itemId: alertId }
                    });
                }

                // Broadcast escalation to all doctors/admins via socket
                if (io) {
                    io.to('admin_and_doctors').emit('escalate_alert', {
                        patientUserId: req.user._id,
                        patientName: req.user.name,
                        noResponseCount: recentNoResponses,
                        message: notifMessage,
                        alertId
                    });
                }

                // Mark original alert as escalated
                await Alert.findByIdAndUpdate(alertId, { escalatedToDoctor: true });

                return res.status(201).json({
                    feedback,
                    escalated: true,
                    message: 'Feedback recorded. Alert has been escalated to your doctor.'
                });
            }
        }

        // Notify patient's room that feedback was received (closes the prompt in UI)
        if (io) {
            io.to(req.user._id.toString()).emit('feedback_acknowledged', {
                alertId,
                response: response.toLowerCase()
            });
        }

        res.status(201).json({ feedback, escalated: false });
    } catch (error) {
        console.error('Feedback respond error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all feedback for a patient (doctor/admin view)
// @route   GET /api/feedback/:patientUserId
// @access  Private (Doctor/Admin)
const getPatientFeedback = async (req, res) => {
    try {
        const { patientUserId } = req.params;
        const { limit = 50 } = req.query;

        const feedbackList = await PatientFeedback.find({ patientUserId })
            .sort({ timestamp: -1 })
            .limit(Number(limit))
            .populate('alertId', 'type severity message');

        res.json(feedbackList);
    } catch (error) {
        console.error('Get patient feedback error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { respondToAlert, getPatientFeedback };
