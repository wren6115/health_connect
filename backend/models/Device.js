const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    // The User _id of the patient this device belongs to
    patientUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    deviceId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    deviceType: {
        type: String,
        enum: ['ESP32', 'ESP8266', 'RaspberryPi', 'Arduino', 'Simulator', 'Other'],
        default: 'Other'
    },
    // Shared secret the device sends in headers for authentication
    deviceToken: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastSeen: {
        type: Date,
        default: null
    },
    registeredAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Device', deviceSchema);
