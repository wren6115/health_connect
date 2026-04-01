const mongoose = require('mongoose');

const healthReportSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
        index: true
    },
    reportType: {
        type: String,
        enum: ['auto', 'manual', 'diagnostic'],
        default: 'auto',
        required: true
    },
    // 60-second aggregated vitals
    aggregatedVitals: {
        avgHeartRate: Number,
        avgSpO2: Number,
        avgTemperature: Number,
        minHeartRate: Number,
        maxHeartRate: Number,
        readingsCount: {
            type: Number,
            default: 0
        }
    },
    // Anomalies detected
    anomalies: {
        abnormalHR: Boolean,
        abnormalSpO2: Boolean,
        abnormalTemp: Boolean,
        details: [String]
    },
    // Time range covered by this report
    reportPeriod: {
        startTime: Date,
        endTime: Date
    },
    // Status
    status: {
        type: String,
        enum: ['generated', 'reviewed', 'escalated'],
        default: 'generated'
    },
    // Optional: AI summary (from chatbot)
    aiSummary: String,
    
    // Admin review notes
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewNotes: String,

    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Index for quick lookups: patient + time
healthReportSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('HealthReport', healthReportSchema);
