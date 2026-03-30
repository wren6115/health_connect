const twilio = require('twilio');
const Alert = require('../models/Alert');
const Patient = require('../models/Patient');
const User = require('../models/User');

// Lazy Twilio client — only created when first needed, avoids crash on startup with placeholder creds
const getTwilioClient = () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token && sid.startsWith('AC')) {
        return twilio(sid, token);
    }
    return null;
};

// --- Configurable Thresholds (override via .env) ---
const THRESHOLDS = {
    heartRate: {
        low:      Number(process.env.HR_LOW      ?? 60),
        high:     Number(process.env.HR_HIGH     ?? 100),
        critical: Number(process.env.HR_CRITICAL ?? 140)
    },
    spo2: {
        warning:  Number(process.env.SPO2_WARNING  ?? 94),
        critical: Number(process.env.SPO2_CRITICAL ?? 90)
    },
    temperature: {
        fever:         Number(process.env.TEMP_FEVER         ?? 38.0),
        highFever:     Number(process.env.TEMP_HIGH_FEVER    ?? 39.5),
        hypothermia:   Number(process.env.TEMP_HYPOTHERMIA   ?? 35.0)
    },
    bloodPressure: {
        systolicHigh:   Number(process.env.BP_SYS_HIGH   ?? 140),
        systolicLow:    Number(process.env.BP_SYS_LOW    ?? 90),
        diastolicHigh:  Number(process.env.BP_DIA_HIGH   ?? 90)
    }
};

const checkAbnormalities = async (patientUserId, data, io) => {
    const { hr, spo2, temp, bpSystolic, bpDiastolic } = data;
    const abnormalConditions = [];

    // --- Heart Rate ---
    if (hr != null) {
        if (hr < THRESHOLDS.heartRate.low) {
            abnormalConditions.push({ type: 'Heart Rate', value: hr, severity: 'warning', message: `⚠️ Low Heart Rate (Bradycardia): ${hr} bpm` });
        } else if (hr > THRESHOLDS.heartRate.critical) {
            abnormalConditions.push({ type: 'Heart Rate', value: hr, severity: 'critical', message: `🚨 Critically High Heart Rate: ${hr} bpm` });
        } else if (hr > THRESHOLDS.heartRate.high) {
            abnormalConditions.push({ type: 'Heart Rate', value: hr, severity: 'warning', message: `⚠️ High Heart Rate (Tachycardia): ${hr} bpm` });
        }
    }

    // --- SpO2 ---
    if (spo2 != null) {
        if (spo2 < THRESHOLDS.spo2.critical) {
            abnormalConditions.push({ type: 'SpO2', value: spo2, severity: 'critical', message: `🚨 Critically Low SpO2: ${spo2}% — Immediate attention needed!` });
        } else if (spo2 < THRESHOLDS.spo2.warning) {
            abnormalConditions.push({ type: 'SpO2', value: spo2, severity: 'warning', message: `⚠️ Low SpO2 (Hypoxia risk): ${spo2}%` });
        }
    }

    // --- Temperature ---
    if (temp != null) {
        if (temp >= THRESHOLDS.temperature.highFever) {
            abnormalConditions.push({ type: 'Temperature', value: temp, severity: 'critical', message: `🚨 High Fever: ${temp}°C` });
        } else if (temp >= THRESHOLDS.temperature.fever) {
            abnormalConditions.push({ type: 'Temperature', value: temp, severity: 'warning', message: `⚠️ Fever detected: ${temp}°C` });
        } else if (temp < THRESHOLDS.temperature.hypothermia) {
            abnormalConditions.push({ type: 'Temperature', value: temp, severity: 'critical', message: `🚨 Hypothermia: ${temp}°C` });
        }
    }

    // --- Blood Pressure ---
    if (bpSystolic != null && bpDiastolic != null) {
        if (bpSystolic > THRESHOLDS.bloodPressure.systolicHigh || bpDiastolic > THRESHOLDS.bloodPressure.diastolicHigh) {
            abnormalConditions.push({ type: 'Blood Pressure', value: bpSystolic, severity: 'warning', message: `⚠️ High Blood Pressure: ${bpSystolic}/${bpDiastolic} mmHg` });
        } else if (bpSystolic < THRESHOLDS.bloodPressure.systolicLow) {
            abnormalConditions.push({ type: 'Blood Pressure', value: bpSystolic, severity: 'warning', message: `⚠️ Low Blood Pressure: ${bpSystolic}/${bpDiastolic} mmHg` });
        }
    }

    if (abnormalConditions.length > 0) {
        try {
            const patient = await Patient.findOne({ userId: patientUserId }).populate('userId');
            if (!patient) return;

            const vitalsSnapshot = { heartRate: hr, spo2, temperature: temp, bloodPressureSystolic: bpSystolic, bloodPressureDiastolic: bpDiastolic };

            for (const condition of abnormalConditions) {
                // Save alert to DB with enhanced fields
                const alert = await Alert.create({
                    patientId: patient._id,
                    type: condition.type,
                    value: condition.value,
                    severity: condition.severity,
                    message: condition.message,
                    feedbackRequested: true  // Always ask the patient "Are you okay?"
                });

                const alertPayload = {
                    alertId: alert._id,
                    patientUserId: patient.userId._id,
                    patientName: patient.userId.name,
                    alert: condition,
                    vitalsSnapshot
                };

                // 1. Notify the specific patient (live_health dashboard alert)
                io.to(patient.userId._id.toString()).emit('new_alert', alertPayload);

                // 2. Ask patient "Are you okay?" — triggers a feedback prompt in their UI
                io.to(patient.userId._id.toString()).emit('feedback_request', {
                    alertId: alert._id,
                    message: condition.message,
                    severity: condition.severity,
                    vitalsSnapshot
                });

                // 3. Notify admins and doctors
                io.to('admin_and_doctors').emit('new_alert', alertPayload);

                // 4. Emergency SOS SMS via Twilio (critical only, to avoid SMS spam)
                if (condition.severity === 'critical') {
                    const twilioClient = getTwilioClient();
                    if (twilioClient && process.env.TWILIO_PHONE_NUMBER && patient.emergencyContactPhone) {
                        try {
                            await twilioClient.messages.create({
                                body: `URGENT SOS: ${patient.userId.name} is experiencing: ${condition.message}. Please check on them immediately.`,
                                from: process.env.TWILIO_PHONE_NUMBER,
                                to: patient.emergencyContactPhone
                            });
                            console.log(`SOS SMS sent to ${patient.emergencyContactName} (${patient.emergencyContactPhone})`);
                        } catch (smsError) {
                            console.error('Failed to send Twilio SMS:', smsError.message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in checkAbnormalities:', error);
        }
    }
};

module.exports = { checkAbnormalities, THRESHOLDS };
