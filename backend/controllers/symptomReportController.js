const SymptomReport = require('../models/SymptomReport');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Keywords for severity detection
const urgentKeywords = ['chest pain', 'breathing issue', 'shortness of breath', 'severe pain', 'unconscious', 'bleeding'];
const warningKeywords = ['fever', 'headache', 'nausea', 'vomiting', 'dizzy', 'weakness'];

const determineSeverity = (message) => {
    const msg = message.toLowerCase();
    let severity = 'low';
    let detectedSymptoms = [];

    // Check for urgent keywords first
    for (const keyword of urgentKeywords) {
        if (msg.includes(keyword)) {
            severity = 'high';
            detectedSymptoms.push(keyword);
        }
    }

    // Only update to medium if not already high
    for (const keyword of warningKeywords) {
        if (msg.includes(keyword)) {
            if (severity === 'low') severity = 'medium';
            detectedSymptoms.push(keyword);
        }
    }

    return { severity, detectedSymptoms };
};

// @desc    Create symptom report
// @route   POST /api/symptoms
// @access  Private (Patient)
const createSymptomReport = async (req, res) => {
    try {
        const { message } = req.body;

        const { severity, detectedSymptoms } = determineSeverity(message);

        // Find a random doctor to assign (for demo purposes)
        // In a real app, this would be based on patient's primary care physician
        const doctor = await User.findOne({ role: 'doctor' });

        const report = new SymptomReport({
            patient: req.user._id,
            message,
            detectedSymptoms,
            severity,
            assignedDoctor: doctor ? doctor._id : null
        });

        const savedReport = await report.save();

        // Create notification for high severity
        if (severity === 'high' && doctor) {
            await Notification.create({
                recipient: doctor._id,
                type: 'symptom',
                message: `URGENT: High severity symptom report from ${req.user.name}`,
                relatedItem: {
                    itemType: 'SymptomReport',
                    itemId: savedReport._id
                }
            });

            // Also notify admins
            const admins = await User.find({ role: 'admin' });
            for (const admin of admins) {
                await Notification.create({
                    recipient: admin._id,
                    type: 'system',
                    message: `URGENT SYSTEM ALERT: High severity symptom reported by ${req.user.name}`,
                    relatedItem: {
                        itemType: 'SymptomReport',
                        itemId: savedReport._id
                    }
                });
            }
        }

        res.status(201).json(savedReport);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all symptom reports
// @route   GET /api/symptoms
// @access  Private
const getSymptomReports = async (req, res) => {
    try {
        let query = {};

        if (req.user.role === 'patient') {
            query.patient = req.user._id;
        } else if (req.user.role === 'doctor') {
            query.assignedDoctor = req.user._id;
        }

        const reports = await SymptomReport.find(query)
            .populate('patient', 'name email')
            .populate('assignedDoctor', 'name email')
            .sort({ createdAt: -1 });

        res.json(reports);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update symptom report status
// @route   PUT /api/symptoms/:id/status
// @access  Private (Doctor/Admin)
const updateSymptomReportStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const report = await SymptomReport.findById(req.params.id);

        if (report) {
            report.status = status;
            const updatedReport = await report.save();

            res.json(updatedReport);
        } else {
            res.status(404).json({ message: 'Symptom report not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createSymptomReport,
    getSymptomReports,
    updateSymptomReportStatus
};
