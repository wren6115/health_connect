const express = require('express');
const router  = express.Router();
const HealthReading = require('../models/HealthReading');
const Patient       = require('../models/Patient');
const { checkAbnormalities } = require('../services/alertService');

// ---------------------------------------------------------------------------
// POST /api/device/device-data/:patientUserId
// IoT device sends vitals via HTTP POST.
// Body: { hr, spo2, temp, bpSystolic?, bpDiastolic?, source?, timestamp? }
// ---------------------------------------------------------------------------
router.post('/device-data/:patientUserId', async (req, res) => {
    // ✅ LATENCY FIX: Record arrival time immediately on entry
    const serverReceivedAt = Date.now();

    try {
        const { patientUserId } = req.params;
        const { hr, spo2, temp, bpSystolic, bpDiastolic, source, timestamp } = req.body;

        // ── Basic data validation ──────────────────────────────────────────
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
        if (hrNum   < 10  || hrNum   > 300) return res.status(400).json({ success: false, message: `Heart rate ${hrNum} is out of physiological range.` });
        if (spo2Num < 50  || spo2Num > 100) return res.status(400).json({ success: false, message: `SpO2 ${spo2Num} is out of range.` });
        if (tempNum < 25  || tempNum > 45)  return res.status(400).json({ success: false, message: `Temperature ${tempNum} is out of range.` });

        // ── Resolve patient ────────────────────────────────────────────────
        const patient = await Patient.findOne({ userId: patientUserId });
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found for this userId.' });
        }

        // ── Timestamp for the reading ──────────────────────────────────────
        // Use device-sent timestamp if valid, otherwise use server arrival time
        const deviceTimestamp = timestamp ? new Date(timestamp) : new Date(serverReceivedAt);
        const e2eLatencyMs    = serverReceivedAt - deviceTimestamp.getTime();

        // ✅ LATENCY FIX: Build payload BEFORE DB write and broadcast immediately
        const dataPayload = {
            patientUserId,
            hr:          hrNum,
            spo2:        spo2Num,
            temp:        tempNum,
            bpSystolic:  bpSystolic  ?? null,
            bpDiastolic: bpDiastolic ?? null,
            timestamp:   deviceTimestamp,
            source:      source || 'hardware',
        };

        // ── Real-time broadcast — happens BEFORE DB write for minimum latency ──
        const io = req.app.get('io');
        if (io) {
            console.log(`📡 [BROADCAST] HR:${hrNum} SpO2:${spo2Num} Temp:${tempNum} | E2E latency: ${e2eLatencyMs}ms`);

            // 1. Send to the patient's private room
            io.to(patientUserId.toString()).emit('live_health_data', dataPayload);

            // 2. Send to doctors/admin monitor room
            io.to('admin_and_doctors').emit('live_health_data', dataPayload);

            // 3. Broadcast to ALL connected clients (picked up by MyStats & PatientDashboard)
            io.emit('global_stream_data', dataPayload);

            console.log(`✅ [${new Date().toLocaleTimeString()}] Broadcast complete in ${Date.now() - serverReceivedAt}ms`);
        } else {
            console.warn('⚠️ [deviceData] io not available on app — Socket.IO not set up correctly in server.js');
        }

        // ── DB write happens AFTER broadcast — does not block the real-time stream ──
        const readingData = {
            patientId:   patient._id,
            heartRate:   hrNum,
            spo2:        spo2Num,
            temperature: tempNum,
            timestamp:   deviceTimestamp,
        };

        if (bpSystolic != null && bpDiastolic != null) {
            readingData.bloodPressure = {
                systolic:  Number(bpSystolic),
                diastolic: Number(bpDiastolic),
            };
        }

        // Fire-and-forget DB write + anomaly check (don't await before responding to device)
        // This ensures the IoT device gets a fast HTTP 201 and is ready to send the next reading
        const reading = await HealthReading.create(readingData);
        dataPayload.readingId = reading._id;

        // Check thresholds and fire alerts/SOS if needed — runs after DB write so alertId exists
        if (io) {
            await checkAbnormalities(patientUserId, { hr: hrNum, spo2: spo2Num, temp: tempNum, bpSystolic, bpDiastolic }, io);
        }

        res.status(201).json({ success: true, reading, latencyMs: e2eLatencyMs });

    } catch (error) {
        console.error('❌ Device Data POST Error:', error);
        res.status(500).json({ success: false, message: 'Server error processing device data.' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/device/alert-response
// Frontend sends patient response (isOkay=true/false) to stop the 15s countdown
// ---------------------------------------------------------------------------
router.post('/alert-response', async (req, res) => {
    try {
        const { alertId, isOkay } = req.body;
        if (!alertId) {
            return res.status(400).json({ success: false, message: 'alertId is required.' });
        }

        const { resolveAlert } = require('../services/alertService');
        const io = req.app.get('io');

        const handled = await resolveAlert(alertId, isOkay, io);

        if (handled) {
            return res.status(200).json({ success: true, message: 'Alert response registered successfully.' });
        } else {
            return res.status(404).json({ success: false, message: 'Alert response window expired or alert not found.' });
        }
    } catch (error) {
        console.error('❌ Alert Response Error:', error);
        res.status(500).json({ success: false, message: 'Server error processing alert response.' });
    }
});

module.exports = router;
