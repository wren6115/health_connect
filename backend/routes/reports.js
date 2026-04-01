const express = require('express');
const router = express.Router();
const HealthReport = require('../models/HealthReport');
const Patient = require('../models/Patient');
const { protect, authorize } = require('../middleware/authMiddleware');

// ---------------------------------------------------------------------------
// GET /api/reports/:patientUserId/history
// Fetch report history for a patient (last 24 hours, paginated)
// ---------------------------------------------------------------------------
router.get('/history/:patientUserId', protect, async (req, res) => {
    try {
        const { patientUserId } = req.params;
        const { limit = 20, skip = 0 } = req.query;

        // Find patient by userId
        const patient = await Patient.findOne({ userId: patientUserId });
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        // Fetch reports (last 24 hours by default)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const reports = await HealthReport.find({
            patientId: patient._id,
            createdAt: { $gte: twentyFourHoursAgo }
        })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const totalCount = await HealthReport.countDocuments({
            patientId: patient._id
        });

        res.status(200).json({
            success: true,
            reports,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: skip + limit < totalCount
            }
        });
    } catch (error) {
        console.error('Report History Get Error:', error);
        res.status(500).json({ success: false, message: 'Error fetching report history' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/reports/:reportId
// Fetch a specific report by ID
// ---------------------------------------------------------------------------
router.get('/:reportId', protect, async (req, res) => {
    try {
        const { reportId } = req.params;

        const report = await HealthReport.findById(reportId)
            .populate('patientId', 'name email')
            .populate('reviewedBy', 'name email');

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        res.status(200).json({ success: true, report });
    } catch (error) {
        console.error('Report Get Error:', error);
        res.status(500).json({ success: false, message: 'Error fetching report' });
    }
});

// ---------------------------------------------------------------------------
// PUT /api/reports/:reportId/review
// Doctor/Admin adds review notes to a report
// ---------------------------------------------------------------------------
router.put('/:reportId/review', protect, authorize('doctor', 'admin'), async (req, res) => {
    try {
        const { reportId } = req.params;
        const { reviewNotes, status } = req.body;

        const report = await HealthReport.findByIdAndUpdate(
            reportId,
            {
                reviewNotes,
                status: status || 'reviewed',
                reviewedBy: req.user._id
            },
            { new: true }
        );

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        res.status(200).json({ success: true, report });
    } catch (error) {
        console.error('Report Update Error:', error);
        res.status(500).json({ success: false, message: 'Error updating report' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/reports/stats/:patientUserId
// Get report statistics for a patient (for dashboard summary)
// ---------------------------------------------------------------------------
router.get('/stats/:patientUserId', protect, async (req, res) => {
    try {
        const { patientUserId } = req.params;

        const patient = await Patient.findOne({ userId: patientUserId });
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        // Calculate stats
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const totalReports = await HealthReport.countDocuments({ patientId: patient._id });
        const reportsToday = await HealthReport.countDocuments({
            patientId: patient._id,
            createdAt: { $gte: twentyFourHoursAgo }
        });
        
        const anomalousReports = await HealthReport.countDocuments({
            patientId: patient._id,
            $or: [
                { 'anomalies.abnormalHR': true },
                { 'anomalies.abnormalSpO2': true },
                { 'anomalies.abnormalTemp': true }
            ]
        });

        // Get latest values
        const latestReport = await HealthReport.findOne({ patientId: patient._id }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            stats: {
                totalReports,
                reportsToday,
                anomalousReports,
                latestReport: latestReport ? {
                    id: latestReport._id,
                    aggregatedVitals: latestReport.aggregatedVitals,
                    anomalies: latestReport.anomalies,
                    createdAt: latestReport.createdAt
                } : null
            }
        });
    } catch (error) {
        console.error('Report Stats Error:', error);
        res.status(500).json({ success: false, message: 'Error fetching report statistics' });
    }
});

module.exports = router;
