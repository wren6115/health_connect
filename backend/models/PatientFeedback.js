const mongoose = require('mongoose');

const patientFeedbackSchema = new mongoose.Schema({
    alertId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alert',
        required: true
    },
    // The User _id of the patient (not the Patient collection _id)
    patientUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    response: {
        type: String,
        enum: ['yes', 'no'],
        required: true
    },
    // Snapshot of vitals at the time the alert was triggered
    vitalsSnapshot: {
        heartRate: Number,
        spo2: Number,
        temperature: Number,
        bloodPressureSystolic: Number,
        bloodPressureDiastolic: Number
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

module.exports = mongoose.model('PatientFeedback', patientFeedbackSchema);
