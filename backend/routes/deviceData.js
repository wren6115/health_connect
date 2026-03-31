const express = require('express');
const router = express.Router();
const HealthReading = require('../models/HealthReading');
const Patient = require('../models/Patient');
const { checkAbnormalities } = require('../services/alertService');

// ---------------------------------------------------------------------------
// POST /api/device/device-data/:patientUserId
// IoT device sends vitals via HTTP POST.
// Body: { hr, spo2, temp, bpSystolic?, bpDiastolic? }
// ---------------------------------------------------------------------------
router.post('/device-data/:patientUserId', async (req, res) => {
    try {
        const { patientUserId } = req.params;
        const { hr, spo2, temp, bpSystolic, bpDiastolic, source } = req.body;

        // --- Basic data validation ---
        if (hr == null || spo2 == null || temp == null) {
            return res.status(400).json({ success: false, message: 'hr, spo2, and temp are required fields.' });
        }

        const hrNum   = Number(hr);
        const spo2Num = Number(spo2);
        const tempNum = Number(temp);

        if (isNaN(hrNum) || isNaN(spo2Num) || isNaN(tempNum)) {
            return res.status(400).json({ success: false, message: 'hr, spo2, and temp must be valid numbers.' });
        }

        // Range sanity checks (reject clearly impossible values)
        if (hrNum < 10 || hrNum > 300) return res.status(400).json({ success: false, message: `Heart rate ${hrNum} is out of physiological range.` });
        if (spo2Num < 50 || spo2Num > 100) return res.status(400).json({ success: false, message: `SpO2 ${spo2Num} is out of range.` });
        if (tempNum < 25 || tempNum > 45) return res.status(400).json({ success: false, message: `Temperature ${tempNum} is out of range.` });

        // --- Resolve patient ---
        const patient = await Patient.findOne({ userId: patientUserId });
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found for this userId.' });
        }

        // --- Build the reading document ---
        const readingData = {
            patientId: patient._id,
            heartRate: hrNum,
            spo2: spo2Num,
            temperature: tempNum
        };

        // Optional blood pressure
        if (bpSystolic != null && bpDiastolic != null) {
            readingData.bloodPressure = {
                systolic: Number(bpSystolic),
                diastolic: Number(bpDiastolic)
            };
        }

        const reading = await HealthReading.create(readingData);

        // --- Real-time broadcast via Socket.io ---
        const io = req.app.get('io');
        if (io) {
            const dataPayload = {
                patientUserId,
                hr: hrNum,
                spo2: spo2Num,
                temp: tempNum,
                bpSystolic: bpSystolic ?? null,
                bpDiastolic: bpDiastolic ?? null,
                timestamp: reading.timestamp,
                readingId: reading._id,
                source: source || "unknown"
            };

            // Send to the patient's own room (Private stream)
            io.to(patientUserId.toString()).emit('live_health_data', dataPayload);
            
            // Send to monitor dashboard (Professional stream)
            io.to('admin_and_doctors').emit('live_health_data', dataPayload);

            // Trigger global update with exact matching data
            io.emit('global_stream_data', dataPayload);

            // Check thresholds and fire alerts + feedback_request backend-side
            await checkAbnormalities(patientUserId, { hr: hrNum, spo2: spo2Num, temp: tempNum, bpSystolic, bpDiastolic }, io);
        }

        res.status(201).json({ success: true, reading });
    } catch (error) {
        console.error('Device Data POST Error:', error);
        res.status(500).json({ success: false, message: 'Server error processing device data.' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/device/alert-response
// Frontend sends patient response (isOkay=true/false) to stop countdown
// ---------------------------------------------------------------------------
router.post('/alert-response', async (req, res) => {
    try {
        const { alertId, isOkay } = req.body;
        if (!alertId) {
            return res.status(400).json({ success: false, message: 'alertId is required.' });
        }

        // Import resolveAlert here to avoid circular dependencies if any
        const { resolveAlert } = require('../services/alertService');
        const io = req.app.get('io');
        
        const handled = await resolveAlert(alertId, isOkay, io);
        
        if (handled) {
            return res.status(200).json({ success: true, message: 'Alert response registered successfully.' });
        } else {
            return res.status(404).json({ success: false, message: 'Alert response window expired or alert not found.' });
        }
    } catch (error) {
        console.error('Alert Response Error:', error);
        res.status(500).json({ success: false, message: 'Server error processing alert response.' });
    }
});

module.exports = router;
