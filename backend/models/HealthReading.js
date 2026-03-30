const mongoose = require('mongoose');

const healthReadingSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    heartRate: {
        type: Number,
        required: true
    },
    spo2: {
        type: Number,
        required: true
    },
    temperature: {
        type: Number,
        required: true
    },
    bloodPressure: {
        systolic: { type: Number },
        diastolic: { type: Number }
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

module.exports = mongoose.model('HealthReading', healthReadingSchema);
