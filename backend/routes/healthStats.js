const express = require('express');
const router = express.Router();
const HealthReading = require('../models/HealthReading');
const Patient = require('../models/Patient');
const { protect, authorize } = require('../middleware/authMiddleware');

// ---------------------------------------------------------------------------
// Helper: resolve Patient document from a User _id
// ---------------------------------------------------------------------------
const getPatientByUserId = async (patientUserId) => {
    return Patient.findOne({ userId: patientUserId });
};

// ---------------------------------------------------------------------------
// GET /api/health-stats/vitals/:patientUserId
// Returns the most recent N readings for a patient from the real DB.
// Access: the patient themselves, or any doctor/admin.
// ---------------------------------------------------------------------------
router.get('/vitals/:patientUserId', protect, async (req, res) => {
    try {
        const { patientUserId } = req.params;
        const limit = Math.min(Number(req.query.limit) || 50, 500); // cap at 500

        // Auth check: patient can only see their own data
        if (req.user.role === 'patient' && req.user._id.toString() !== patientUserId) {
            return res.status(403).json({ message: 'Not authorized to view this patient\'s vitals.' });
        }

        const patient = await getPatientByUserId(patientUserId);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found.' });
        }

        const readings = await HealthReading.find({ patientId: patient._id })
            .sort({ timestamp: -1 })
            .limit(limit);

        res.json({ success: true, count: readings.length, readings });
    } catch (error) {
        console.error('GET /vitals error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ---------------------------------------------------------------------------
// GET /api/health-stats/vitals/:patientUserId/history
// Returns readings within a time range. Defaults to last 24 hours.
// Query params: startDate, endDate (ISO strings), limit
// ---------------------------------------------------------------------------
router.get('/vitals/:patientUserId/history', protect, async (req, res) => {
    try {
        const { patientUserId } = req.params;
        const limit = Math.min(Number(req.query.limit) || 200, 1000);

        if (req.user.role === 'patient' && req.user._id.toString() !== patientUserId) {
            return res.status(403).json({ message: 'Not authorized.' });
        }

        const patient = await getPatientByUserId(patientUserId);
        if (!patient) return res.status(404).json({ message: 'Patient not found.' });

        const endDate   = req.query.endDate   ? new Date(req.query.endDate)   : new Date();
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);

        const readings = await HealthReading.find({
            patientId: patient._id,
            timestamp: { $gte: startDate, $lte: endDate }
        })
            .sort({ timestamp: 1 })
            .limit(limit);

        res.json({ success: true, count: readings.length, startDate, endDate, readings });
    } catch (error) {
        console.error('GET /vitals/history error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ---------------------------------------------------------------------------
// GET /api/health-stats/vitals/:patientUserId/patterns
// Pattern learning: aggregates hourly averages from all historical readings.
// A reading at hour H is "normal" if it's within ±15% of that hour's average.
// ---------------------------------------------------------------------------
router.get('/vitals/:patientUserId/patterns', protect, authorize('doctor', 'admin'), async (req, res) => {
    try {
        const { patientUserId } = req.params;

        const patient = await getPatientByUserId(patientUserId);
        if (!patient) return res.status(404).json({ message: 'Patient not found.' });

        // Aggregate average vitals per hour-of-day (0–23)
        const hourlyAverages = await HealthReading.aggregate([
            { $match: { patientId: patient._id } },
            {
                $group: {
                    _id: { hour: { $hour: '$timestamp' } },
                    avgHeartRate:  { $avg: '$heartRate' },
                    avgSpo2:       { $avg: '$spo2' },
                    avgTemp:       { $avg: '$temperature' },
                    readingCount:  { $sum: 1 }
                }
            },
            { $sort: { '_id.hour': 1 } }
        ]);

        // Format for easy frontend consumption
        const patterns = hourlyAverages.map(h => ({
            hour: h._id.hour,
            label: `${String(h._id.hour).padStart(2, '0')}:00`,
            avgHeartRate:  Math.round(h.avgHeartRate  * 10) / 10,
            avgSpo2:       Math.round(h.avgSpo2       * 10) / 10,
            avgTemp:       Math.round(h.avgTemp        * 100) / 100,
            readingCount:  h.readingCount,
            // Thresholds for "normal pattern" band (±15%)
            normalBand: {
                heartRate: {
                    min: Math.round(h.avgHeartRate * 0.85),
                    max: Math.round(h.avgHeartRate * 1.15)
                },
                spo2: {
                    min: Math.round(h.avgSpo2 * 0.85 * 10) / 10,
                    max: 100
                },
                temp: {
                    min: Math.round(h.avgTemp * 0.85 * 100) / 100,
                    max: Math.round(h.avgTemp * 1.15 * 100) / 100
                }
            }
        }));

        res.json({
            success: true,
            patientUserId,
            hoursWithData: patterns.length,
            interpretation: 'A reading is considered a known pattern if it falls within the normalBand for its hour of day.',
            patterns
        });
    } catch (error) {
        console.error('GET /vitals/patterns error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ---------------------------------------------------------------------------
// GET /api/health-stats/vitals/:patientUserId/latest
// Returns single most recent reading (handy for dashboard cards).
// ---------------------------------------------------------------------------
router.get('/vitals/:patientUserId/latest', protect, async (req, res) => {
    try {
        const { patientUserId } = req.params;

        if (req.user.role === 'patient' && req.user._id.toString() !== patientUserId) {
            return res.status(403).json({ message: 'Not authorized.' });
        }

        const patient = await getPatientByUserId(patientUserId);
        if (!patient) return res.status(404).json({ message: 'Patient not found.' });

        const reading = await HealthReading.findOne({ patientId: patient._id }).sort({ timestamp: -1 });

        if (!reading) return res.status(404).json({ message: 'No readings found for this patient.' });

        res.json({ success: true, reading });
    } catch (error) {
        console.error('GET /vitals/latest error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
