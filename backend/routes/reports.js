const express = require('express');
const router = express.Router();
const HealthReport = require('../models/HealthReport');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const HealthReading = require('../models/HealthReading');
const { protect, authorize } = require('../middleware/authMiddleware');
const { auditLog } = require('../middleware/auditMiddleware');

// ---------------------------------------------------------------------------
// GET /api/reports/history/:patientUserId  (existing — unchanged)
// ---------------------------------------------------------------------------
router.get('/history/:patientUserId', protect, async (req, res) => {
    try {
        const { patientUserId } = req.params;
        const { limit = 20, skip = 0 } = req.query;
        const patient = await Patient.findOne({ userId: patientUserId });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const reports = await HealthReport.find({
            patientId: patient._id,
            createdAt: { $gte: twentyFourHoursAgo }
        }).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(parseInt(skip));

        const totalCount = await HealthReport.countDocuments({ patientId: patient._id });
        res.status(200).json({ success: true, reports, pagination: { total: totalCount, limit: parseInt(limit), skip: parseInt(skip) } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching report history' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/reports/stats/:patientUserId  (existing — unchanged)
// ---------------------------------------------------------------------------
router.get('/stats/:patientUserId', protect, async (req, res) => {
    try {
        const { patientUserId } = req.params;
        const patient = await Patient.findOne({ userId: patientUserId });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [totalReports, reportsToday, anomalousReports, latestReport] = await Promise.all([
            HealthReport.countDocuments({ patientId: patient._id }),
            HealthReport.countDocuments({ patientId: patient._id, createdAt: { $gte: twentyFourHoursAgo } }),
            HealthReport.countDocuments({
                patientId: patient._id,
                $or: [{ 'anomalies.abnormalHR': true }, { 'anomalies.abnormalSpO2': true }, { 'anomalies.abnormalTemp': true }]
            }),
            HealthReport.findOne({ patientId: patient._id }).sort({ createdAt: -1 })
        ]);

        res.status(200).json({
            success: true,
            stats: { totalReports, reportsToday, anomalousReports, latestReport: latestReport ? { id: latestReport._id, aggregatedVitals: latestReport.aggregatedVitals, anomalies: latestReport.anomalies, createdAt: latestReport.createdAt } : null }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching report statistics' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/reports/:reportId  (existing — unchanged)
// ---------------------------------------------------------------------------
router.get('/:reportId', protect, async (req, res) => {
    try {
        const report = await HealthReport.findById(req.params.reportId)
            .populate('patientId', 'name email').populate('reviewedBy', 'name email');
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
        res.status(200).json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching report' });
    }
});

// ---------------------------------------------------------------------------
// PUT /api/reports/:reportId/review  (existing — unchanged)
// ---------------------------------------------------------------------------
router.put('/:reportId/review', protect, authorize('doctor', 'admin'), async (req, res) => {
    try {
        const { reviewNotes, status } = req.body;
        const report = await HealthReport.findByIdAndUpdate(
            req.params.reportId,
            { reviewNotes, status: status || 'reviewed', reviewedBy: req.user._id },
            { new: true }
        );
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
        res.status(200).json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating report' });
    }
});

// ---------------------------------------------------------------------------
// ═══════════ NEW REPORT GENERATION ENDPOINTS ═══════════
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// GET /api/reports/generate/doctor-performance?doctorId=&period=weekly|monthly|yearly
// ---------------------------------------------------------------------------
router.get('/generate/doctor-performance', protect, authorize('admin', 'doctor'), auditLog('GENERATE_DOCTOR_REPORT'), async (req, res) => {
    try {
        const { doctorId, period = 'monthly' } = req.query;
        const targetId = doctorId || req.user._id.toString();

        const now = new Date();
        let startDate;
        if (period === 'weekly') startDate = new Date(now.getTime() - 7 * 86400000);
        else if (period === 'monthly') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        else startDate = new Date(now.getFullYear(), 0, 1); // yearly

        const doctor = await User.findById(targetId).select('-password');
        const profile = await DoctorProfile.findOne({ user: targetId });
        const appointments = await Appointment.find({
            doctor: targetId,
            date: { $gte: startDate, $lte: now }
        }).populate('patient', 'name email').sort({ date: -1 });

        const statusBreakdown = appointments.reduce((acc, a) => {
            acc[a.status] = (acc[a.status] || 0) + 1;
            return acc;
        }, {});

        const uniquePatients = [...new Set(appointments.map(a => a.patient?._id?.toString()))].length;
        const revenue = appointments.filter(a => a.paymentStatus === 'paid').reduce((sum, a) => sum + (a.consultationFee || 0), 0);

        res.json({
            success: true,
            report: {
                type: 'doctor-performance',
                period,
                generatedAt: new Date().toISOString(),
                doctor: { id: doctor._id, name: doctor.name, email: doctor.email, specialization: profile?.specialization },
                summary: {
                    totalAppointments: appointments.length,
                    uniquePatients,
                    revenue,
                    statusBreakdown
                },
                appointments: appointments.map(a => ({
                    id: a._id,
                    patient: a.patient?.name,
                    patientEmail: a.patient?.email,
                    date: a.date,
                    status: a.status,
                    fee: a.consultationFee,
                    reason: a.reason
                }))
            }
        });
    } catch (err) {
        console.error('Doctor performance report error:', err);
        res.status(500).json({ success: false, message: 'Error generating doctor performance report' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/reports/generate/patient-health?patientId=&period=weekly|monthly|yearly
// ---------------------------------------------------------------------------
router.get('/generate/patient-health', protect, authorize('admin', 'doctor'), auditLog('GENERATE_PATIENT_REPORT'), async (req, res) => {
    try {
        const { patientId, period = 'weekly' } = req.query;
        if (!patientId) return res.status(400).json({ success: false, message: 'patientId required' });

        const now = new Date();
        let startDate;
        if (period === 'weekly') startDate = new Date(now.getTime() - 7 * 86400000);
        else if (period === 'monthly') startDate = new Date(now.getTime() - 30 * 86400000);
        else startDate = new Date(now.getTime() - 365 * 86400000);

        const patient = await Patient.findOne({ userId: patientId });
        const userInfo = await User.findById(patientId).select('-password');
        if (!patient || !userInfo) return res.status(404).json({ success: false, message: 'Patient not found' });

        const readings = await HealthReading.find({
            patientId: patient._id,
            timestamp: { $gte: startDate, $lte: now }
        }).sort({ timestamp: 1 });

        const avgHR = readings.length ? (readings.reduce((s, r) => s + r.heartRate, 0) / readings.length).toFixed(1) : 'N/A';
        const avgSpO2 = readings.length ? (readings.reduce((s, r) => s + r.spo2, 0) / readings.length).toFixed(1) : 'N/A';
        const avgTemp = readings.length ? (readings.reduce((s, r) => s + r.temperature, 0) / readings.length).toFixed(1) : 'N/A';

        const anomalies = readings.filter(r =>
            r.heartRate < 50 || r.heartRate > 100 || r.spo2 < 92 || r.temperature < 35 || r.temperature > 38
        );

        const appointments = await Appointment.find({
            patient: patientId,
            date: { $gte: startDate }
        }).populate('doctor', 'name').sort({ date: -1 });

        res.json({
            success: true,
            report: {
                type: 'patient-health',
                period,
                generatedAt: new Date().toISOString(),
                patient: {
                    id: patientId,
                    name: userInfo.name,
                    email: userInfo.email,
                    age: patient.age,
                    gender: patient.gender
                },
                vitals: {
                    totalReadings: readings.length,
                    avgHR,
                    avgSpO2,
                    avgTemp,
                    anomalyCount: anomalies.length
                },
                appointments: appointments.map(a => ({
                    date: a.date,
                    doctor: a.doctor?.name,
                    status: a.status,
                    reason: a.reason
                })),
                readings: readings.slice(-50).map(r => ({
                    timestamp: r.timestamp,
                    heartRate: r.heartRate,
                    spo2: r.spo2,
                    temperature: r.temperature
                }))
            }
        });
    } catch (err) {
        console.error('Patient health report error:', err);
        res.status(500).json({ success: false, message: 'Error generating patient health report' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/reports/generate/appointment-trends?period=weekly|monthly|yearly
// ---------------------------------------------------------------------------
router.get('/generate/appointment-trends', protect, authorize('admin'), auditLog('GENERATE_APPOINTMENT_TRENDS'), async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        const now = new Date();
        let startDate, groupFormat;
        if (period === 'weekly') { startDate = new Date(now.getTime() - 7 * 86400000); groupFormat = '%Y-%m-%d'; }
        else if (period === 'monthly') { startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1); groupFormat = '%Y-%m'; }
        else { startDate = new Date(now.getFullYear() - 1, 0, 1); groupFormat = '%Y-%m'; }

        const trends = await Appointment.aggregate([
            { $match: { date: { $gte: startDate, $lte: now } } },
            {
                $group: {
                    _id: { $dateToString: { format: groupFormat, date: '$date' } },
                    total: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$consultationFee', 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({ success: true, report: { type: 'appointment-trends', period, generatedAt: new Date().toISOString(), trends } });
    } catch (err) {
        console.error('Appointment trends report error:', err);
        res.status(500).json({ success: false, message: 'Error generating appointment trends' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/reports/export/csv?type=doctor-performance|patient-health|appointment-trends&...
// Returns CSV text
// ---------------------------------------------------------------------------
router.get('/export/csv', protect, authorize('admin', 'doctor'), auditLog('EXPORT_CSV'), async (req, res) => {
    try {
        const { type, period = 'monthly', doctorId, patientId } = req.query;
        let csvContent = '';

        if (type === 'appointment-trends') {
            const now = new Date();
            const startDate = period === 'weekly'
                ? new Date(now.getTime() - 7 * 86400000)
                : period === 'yearly'
                    ? new Date(now.getFullYear() - 1, 0, 1)
                    : new Date(now.getFullYear(), now.getMonth() - 5, 1);

            const appointments = await Appointment.find({ date: { $gte: startDate } })
                .populate('patient', 'name').populate('doctor', 'name').sort({ date: -1 });

            csvContent = 'Date,Patient,Doctor,Status,Fee,Payment\n';
            appointments.forEach(a => {
                csvContent += `${new Date(a.date).toLocaleDateString()},${a.patient?.name || ''},${a.doctor?.name || ''},${a.status},${a.consultationFee},${a.paymentStatus}\n`;
            });
        } else if (type === 'patient-health' && patientId) {
            const patient = await Patient.findOne({ userId: patientId });
            const readings = await HealthReading.find({ patientId: patient?._id }).sort({ timestamp: -1 }).limit(100);
            csvContent = 'Timestamp,Heart Rate (bpm),SpO2 (%),Temperature (°C)\n';
            readings.forEach(r => {
                csvContent += `${new Date(r.timestamp).toLocaleString()},${r.heartRate},${r.spo2},${r.temperature}\n`;
            });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid export parameters' });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="healthconnect_${type}_${period}.csv"`);
        res.send(csvContent);
    } catch (err) {
        console.error('CSV export error:', err);
        res.status(500).json({ success: false, message: 'Error exporting CSV' });
    }
});

module.exports = router;
