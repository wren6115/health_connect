const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    type: {
        type: String,
        enum: ['Heart Rate', 'SpO2', 'Temperature', 'Blood Pressure', 'SOS'],
        required: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'warning'
    },
    feedbackRequested: {
        type: Boolean,
        default: false
    },
    feedbackReceived: {
        type: Boolean,
        default: false
    },
    escalatedToDoctor: {
        type: Boolean,
        default: false
    },
    value: {
        type: Number,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Alert', alertSchema);
