const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    platformFeePercent: {
        type: Number,
        default: 10
    },
    platformFee: {
        type: Number,
        required: true
    },
    doctorEarning: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'refunded'],
        default: 'success'
    },
    paymentMethod: {
        type: String,
        default: 'mock_card'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);
