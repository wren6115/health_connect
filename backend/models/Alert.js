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
    status: {
        type: String,
        enum: ['NORMAL', 'WAITING_FOR_RESPONSE', 'RESOLVED', 'ESCALATED'],
        default: 'WAITING_FOR_RESPONSE'
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
