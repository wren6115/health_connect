const mongoose = require('mongoose');

const symptomReportSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    detectedSymptoms: {
        type: [String],
        default: []
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
    },
    status: {
        type: String,
        enum: ['new', 'reviewed'],
        default: 'new'
    },
    assignedDoctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SymptomReport', symptomReportSchema);
