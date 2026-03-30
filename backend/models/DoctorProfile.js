const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    specialization: {
        type: String,
        required: true
    },
    experience: {
        type: Number,  // years
        required: true,
        default: 1
    },
    consultationFee: {
        type: Number,
        required: true,
        default: 100
    },
    bio: {
        type: String,
        default: ''
    },
    education: {
        type: String,
        default: ''
    },
    languages: {
        type: [String],
        default: ['English']
    },
    rating: {
        type: Number,
        default: 4.5,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    availableSlots: {
        type: [String],  // e.g. ["Monday 9AM-12PM", "Wednesday 2PM-5PM"]
        default: []
    },
    isAvailableToday: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
