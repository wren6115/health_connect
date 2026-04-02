const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Patient = require('../models/Patient');
const DoctorProfile = require('../models/DoctorProfile');
const HealthReading = require('../models/HealthReading');
const Alert = require('../models/Alert');

// ─── Helper: get date range ──────────────────────────────────────────────────
function getDateRange(period) {
    const now = new Date();
    if (period === 'weekly') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return { start, end: now, groupFormat: '%Y-%m-%d' };
    } else if (period === 'monthly') {
        const start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        return { start, end: now, groupFormat: '%Y-%m-%d' };
    } else if (period === 'yearly') {
        const start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        return { start, end: now, groupFormat: '%Y-%m' };
    } else {
        // default: last 30 days
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        return { start, end: now, groupFormat: '%Y-%m-%d' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/admin/overview
// Admin: global counts + system health
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/overview', protect, authorize('admin'), async (req, res) => {
    try {
        const [totalUsers, totalDoctors, totalPatients, totalAppointments, activeDevices, pendingUsers] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'doctor' }),
            User.countDocuments({ role: 'patient' }),
            Appointment.countDocuments(),
            HealthReading.distinct('patientId', {
                timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
            }),
            User.countDocuments({ status: 'pending' })
        ]);

        // Appointments today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const appointmentsToday = await Appointment.countDocuments({ date: { $gte: todayStart } });

        // Appointment status breakdown
        const statusBreakdown = await Appointment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Recent critical alerts (last 24h)
        const alertsLast24h = await Alert.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).catch(() => 0);

        res.json({
            success: true,
            overview: {
                totalUsers,
                totalDoctors,
                totalPatients,
                totalAppointments,
                appointmentsToday,
                activeDevicesCount: activeDevices.length,
                pendingUsers,
                alertsLast24h,
                statusBreakdown: statusBreakdown.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {})
            }
        });
    } catch (err) {
        console.error('Analytics overview error:', err);
        res.status(500).json({ success: false, message: 'Error fetching overview analytics' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/admin/appointments?period=weekly|monthly|yearly
// Admin: appointment trends over time (bar chart data)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/appointments', protect, authorize('admin'), async (req, res) => {
    try {
        const period = req.query.period || 'monthly';
        const { start, end, groupFormat } = getDateRange(period);

        const trends = await Appointment.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: { $dateToString: { format: groupFormat, date: '$date' } },
                    count: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({ success: true, period, trends });
    } catch (err) {
        console.error('Admin appointments analytics error:', err);
        res.status(500).json({ success: false, message: 'Error fetching appointment trends' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/admin/doctors
// Admin: all doctors with patient count + appointment volume
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/doctors', protect, authorize('admin'), async (req, res) => {
    try {
        const doctors = await User.find({ role: 'doctor', status: 'approved' }).select('-password');

        const enriched = await Promise.all(doctors.map(async (doc) => {
            const profile = await DoctorProfile.findOne({ user: doc._id });
            const totalAppointments = await Appointment.countDocuments({ doctor: doc._id });
            const thisMonthStart = new Date();
            thisMonthStart.setDate(1);
            thisMonthStart.setHours(0, 0, 0, 0);
            const appointmentsThisMonth = await Appointment.countDocuments({
                doctor: doc._id,
                date: { $gte: thisMonthStart }
            });
            const patientCount = await Appointment.distinct('patient', { doctor: doc._id });

            return {
                _id: doc._id,
                name: doc.name,
                email: doc.email,
                status: doc.status,
                specialization: profile?.specialization || 'General',
                rating: profile?.rating || 0,
                consultationFee: profile?.consultationFee || 0,
                experience: profile?.experience || 0,
                totalAppointments,
                appointmentsThisMonth,
                patientCount: patientCount.length
            };
        }));

        res.json({ success: true, doctors: enriched });
    } catch (err) {
        console.error('Admin doctors analytics error:', err);
        res.status(500).json({ success: false, message: 'Error fetching doctors analytics' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/admin/patients
// Admin: all patients with risk categorization + alert count
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/patients', protect, authorize('admin'), async (req, res) => {
    try {
        const patientUsers = await User.find({ role: 'patient', status: 'approved' }).select('-password');

        const enriched = await Promise.all(patientUsers.map(async (u) => {
            const patientProfile = await Patient.findOne({ userId: u._id }).populate('doctorId', 'name');
            const alertCount = await Alert.countDocuments({ userId: u._id }).catch(() => 0);
            const lastReading = await HealthReading.findOne({ patientId: patientProfile?._id })
                .sort({ timestamp: -1 })
                .catch(() => null);

            // Simple risk categorization by alert count
            const riskLevel = alertCount > 10 ? 'high' : alertCount > 3 ? 'medium' : 'low';

            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                phone: u.phone,
                status: u.status,
                age: patientProfile?.age,
                gender: patientProfile?.gender,
                assignedDoctor: patientProfile?.doctorId || null,
                alertCount,
                riskLevel,
                lastReading: lastReading ? {
                    heartRate: lastReading.heartRate,
                    spo2: lastReading.spo2,
                    temperature: lastReading.temperature,
                    timestamp: lastReading.timestamp
                } : null
            };
        }));

        res.json({ success: true, patients: enriched });
    } catch (err) {
        console.error('Admin patients analytics error:', err);
        res.status(500).json({ success: false, message: 'Error fetching patients analytics' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/doctor/:id?period=weekly|monthly|yearly
// Doctor: own appointment trends + patient load
// ─────────────────────────────────────────────────────────────────────────────
router.get('/doctor/:id', protect, authorize('admin', 'doctor'), async (req, res) => {
    try {
        const { id } = req.params;
        // Doctors can only see their own, admins can see any
        if (req.user.role === 'doctor' && req.user._id.toString() !== id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const period = req.query.period || 'monthly';
        const { start, end, groupFormat } = getDateRange(period);

        const [trends, totalAppointments, uniquePatients] = await Promise.all([
            Appointment.aggregate([
                { $match: { doctor: require('mongoose').Types.ObjectId.createFromHexString(id), date: { $gte: start, $lte: end } } },
                {
                    $group: {
                        _id: { $dateToString: { format: groupFormat, date: '$date' } },
                        count: { $sum: 1 },
                        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Appointment.countDocuments({ doctor: id }),
            Appointment.distinct('patient', { doctor: id })
        ]);

        // Weekly summary (last 4 weeks)
        const weeklyBuckets = [];
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - i * 7);
            const count = await Appointment.countDocuments({
                doctor: id,
                date: { $gte: weekStart, $lte: weekEnd }
            });
            weeklyBuckets.push({ week: `Week ${4 - i}`, count });
        }

        // Monthly summary (last 6 months)
        const monthlyBuckets = [];
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            const count = await Appointment.countDocuments({
                doctor: id,
                date: { $gte: monthStart, $lte: monthEnd }
            });
            monthlyBuckets.push({ month: monthNames[d.getMonth()], count });
        }

        res.json({
            success: true,
            doctorId: id,
            period,
            trends,
            weeklyBuckets,
            monthlyBuckets,
            totalAppointments,
            patientLoad: uniquePatients.length
        });
    } catch (err) {
        console.error('Doctor analytics error:', err);
        res.status(500).json({ success: false, message: 'Error fetching doctor analytics' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/patient/:id
// Patient health trends + alert frequency + risk score
// ─────────────────────────────────────────────────────────────────────────────
router.get('/patient/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        // Patients see only their own
        if (req.user.role === 'patient' && req.user._id.toString() !== id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const patient = await Patient.findOne({ userId: id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const readings = await HealthReading.find({
            patientId: patient._id,
            timestamp: { $gte: sevenDaysAgo }
        }).sort({ timestamp: 1 });

        const alertCount = await Alert.countDocuments({ userId: id }).catch(() => 0);
        const appointmentCount = await Appointment.countDocuments({ patient: id });

        // Build chart data arrays
        const labels = readings.map(r => new Date(r.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
        const hrData = readings.map(r => r.heartRate);
        const spo2Data = readings.map(r => r.spo2);
        const tempData = readings.map(r => r.temperature);

        // Risk score
        const abnormal = readings.filter(r =>
            r.heartRate < 50 || r.heartRate > 100 ||
            r.spo2 < 92 ||
            r.temperature < 35 || r.temperature > 38
        ).length;
        const riskScore = readings.length ? Math.round((abnormal / readings.length) * 100) : 0;
        const riskLevel = riskScore > 30 ? 'high' : riskScore > 10 ? 'medium' : 'low';

        res.json({
            success: true,
            patientId: id,
            chartData: { labels, hrData, spo2Data, tempData },
            alertCount,
            appointmentCount,
            riskScore,
            riskLevel,
            totalReadings: readings.length
        });
    } catch (err) {
        console.error('Patient analytics error:', err);
        res.status(500).json({ success: false, message: 'Error fetching patient analytics' });
    }
});

module.exports = router;
