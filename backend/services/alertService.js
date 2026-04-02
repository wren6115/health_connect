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

// --- Pending Escalation Timers ---
const pendingEscalations = new Map();

// --- Configurable Thresholds (override via .env) ---
const THRESHOLDS = {
    heartRate: {
        low:      Number(process.env.HR_LOW      ?? 50),
        high:     Number(process.env.HR_HIGH     ?? 100)
    },
    spo2: {
        critical: Number(process.env.SPO2_CRITICAL ?? 92)
    },
    temperature: {
        fever:         Number(process.env.TEMP_FEVER         ?? 38.0),
        hypothermia:   Number(process.env.TEMP_HYPOTHERMIA   ?? 35.0)
    }
};

const triggerEmergencyProtocols = async (patient, reason) => {
    console.log(`\n🚨 [SYSTEM ESCALATION] Patient ${patient.userId.name} EMERGENCY TRIGGERED!`);
    console.log(`   ► Reason: ${reason}`);
    console.log(`   ► 📡 Pinging Insurance API for Patient ID: ${patient._id}`);
    console.log(`   ► 🚑 Pinging Ambulance Dispatch API to Location: ${patient.address || 'Unknown'}`);
    
    // Actual Twilio Integration
    const twilioClient = getTwilioClient();
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER && patient.emergencyContactPhone) {
        try {
            await twilioClient.messages.create({
                body: `URGENT SOS: ${patient.userId.name} is experiencing a critical event: ${reason}. Escalation protocols engaged. Location: ${patient.address || 'Unknown'}`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: patient.emergencyContactPhone
            });
            console.log(`   ► 📱 SOS SMS sent to ${patient.emergencyContactName} (${patient.emergencyContactPhone})`);
        } catch (smsError) {
            console.error('   ► Failed to send Twilio SMS:', smsError.message);
        }
    } else {
        console.log(`   ► ⚠️ [MOCK SMS] Would send SOS to ${patient.emergencyContactName} if Twilio configured.`);
    }
};

const resolveAlert = async (alertId, isOkay, io) => {
    const timer = pendingEscalations.get(alertId.toString());
    if (timer) {
        clearTimeout(timer);
        pendingEscalations.delete(alertId.toString());
    }

    const alert = await Alert.findById(alertId).populate({
        path: 'patientId',
        populate: { path: 'userId' }
    });

    // Enforce state transition rule
    if (!alert || alert.status !== 'WAITING_FOR_RESPONSE') return false;

    if (isOkay) {
        alert.status = 'RESOLVED';
        alert.timestamp = new Date(); // Reset timestamp to begin 2-min cooldown window
        await alert.save();
        console.log(`✅ Alert ${alertId} marked as RESOLVED by user.`);
        return true;
    } else {
        alert.status = 'ESCALATED';
        await alert.save();
        console.log(`🚨 Alert ${alertId} ESCALATED by user request!`);
        
        // Core Feature: Notify admins/doctors ONLY when escalated
        if (io) {
            io.to('admin_and_doctors').emit('escalated_alert', {
                alertId: alert._id,
                patientUserId: alert.patientId.userId._id,
                patientName: alert.patientId.userId.name,
                message: alert.message + " (PATIENT REQUESTED HELP)",
                severity: alert.severity
            });
        }
        
        await triggerEmergencyProtocols(alert.patientId, alert.message + " (PATIENT REQUESTED HELP)");
        return true;
    }
};

const executeTimeoutEscalation = async (alertId, io) => {
    pendingEscalations.delete(alertId.toString());
    const alert = await Alert.findById(alertId).populate({
        path: 'patientId',
        populate: { path: 'userId' }
    });

    if (alert && alert.status === 'WAITING_FOR_RESPONSE') {
        alert.status = 'ESCALATED';
        await alert.save();
        console.log(`🚨 Alert ${alertId} ESCALATED by SYSTEM TIMEOUT!`);

        if (io) {
            io.to('admin_and_doctors').emit('escalated_alert', {
                alertId: alert._id,
                patientUserId: alert.patientId.userId._id,
                patientName: alert.patientId.userId.name,
                message: alert.message + " (NO RESPONSE AFTER 15 SECONDS)",
                severity: alert.severity
            });
        }

        await triggerEmergencyProtocols(alert.patientId, alert.message + " (NO RESPONSE AFTER 15 SECONDS)");
    }
};

const checkAbnormalities = async (patientUserId, data, io) => {
    const { hr, spo2, temp, bpSystolic, bpDiastolic } = data;
    const abnormalConditions = [];

    // --- Boundary Checks ---
    if (hr != null) {
        if (hr < THRESHOLDS.heartRate.low) {
            abnormalConditions.push({ type: 'Heart Rate', value: hr, severity: 'critical', message: `🚨 Critically Low Heart Rate: ${hr} bpm` });
        } else if (hr > THRESHOLDS.heartRate.high) {
            abnormalConditions.push({ type: 'Heart Rate', value: hr, severity: 'critical', message: `🚨 High Heart Rate: ${hr} bpm` });
        }
    }
    if (spo2 != null) {
        if (spo2 < THRESHOLDS.spo2.critical) {
            abnormalConditions.push({ type: 'SpO2', value: spo2, severity: 'critical', message: `🚨 Low SpO2 (Hypoxia risk): ${spo2}%` });
        }
    }
    if (temp != null) {
        if (temp > THRESHOLDS.temperature.fever) {
            abnormalConditions.push({ type: 'Temperature', value: temp, severity: 'critical', message: `🚨 High Fever: ${temp}°C` });
        } else if (temp < THRESHOLDS.temperature.hypothermia) {
            abnormalConditions.push({ type: 'Temperature', value: temp, severity: 'critical', message: `🚨 Hypothermia: ${temp}°C` });
        }
    }

    if (abnormalConditions.length === 0) return;

    try {
        const patient = await Patient.findOne({ userId: patientUserId }).populate('userId');
        if (!patient) return;

        // --- SINGLE SOURCE OF TRUTH PREVENTION LOGIC ---
        // Fetch the most recent alert for this patient
        const latestAlert = await Alert.findOne({ patientId: patient._id }).sort({ timestamp: -1 });

        if (latestAlert) {
            // Rule 1: Do not spam. If they are already in an active alert, ignore incoming device spikes.
            if (latestAlert.status === 'WAITING_FOR_RESPONSE') return;
            if (latestAlert.status === 'ESCALATED') {
                const timeSinceEscalated = Date.now() - new Date(latestAlert.timestamp).getTime();
                // [FIX for Instant Alerting] Disabled 5-min cooldown to ensure rapid alerting works during simulation or hardware testing.
                // if (timeSinceEscalated < 5 * 60 * 1000) return; 
            }
            
            // Rule 2: Cooldown. If they just said "YES I AM OK", mask alarms for 2 minutes to let their vitals stabilize.
            if (latestAlert.status === 'RESOLVED') {
                const timeSinceResolved = Date.now() - new Date(latestAlert.timestamp).getTime();
                // [FIX for Instant Alerting] Disabled 2-min cooldown.
                // if (timeSinceResolved < 2 * 60 * 1000) {
                //     return; 
                // }
            }
        }

        const vitalsSnapshot = { heartRate: hr, spo2, temperature: temp, bloodPressureSystolic: bpSystolic, bloodPressureDiastolic: bpDiastolic };

        // Take only the FIRST critical anomaly off the stack to avoid overwhelming identical popups
        const condition = abnormalConditions[0];

        // Ensure database write creates WAITING_FOR_RESPONSE 
        const alert = await Alert.create({
            patientId: patient._id,
            type: condition.type,
            value: condition.value,
            severity: condition.severity,
            message: condition.message,
            status: 'WAITING_FOR_RESPONSE'
        });

        const alertPayload = {
            alertId: alert._id,
            patientUserId: patient.userId._id,
            patientName: patient.userId.name,
            alert: condition,
            vitalsSnapshot
        };

        // Emit EXACTLY one prompt to the patient frontend
        io.to(patient.userId._id.toString()).emit('feedback_request', {
            alertId: alert._id,
            message: condition.message,
            severity: condition.severity,
            vitalsSnapshot
        });

        // DO NOT notify admins here. The strict event-driven system only notifies them upon Escalation.

        console.log(`\n🔔 [NEW ALERT] Patient ${patient.userId.name} -> ${condition.message}. 15s Countdown Started!`);
        
        // Start strict backend-only 15s Failsafe
        const timerId = setTimeout(() => {
            executeTimeoutEscalation(alert._id, io);
        }, 15000);
        
        pendingEscalations.set(alert._id.toString(), timerId);

    } catch (error) {
        console.error('Error in checkAbnormalities:', error);
    }
};

module.exports = { checkAbnormalities, THRESHOLDS, resolveAlert };
