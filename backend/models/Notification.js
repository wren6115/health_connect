const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['symptom', 'appointment', 'system'],
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
    relatedItem: {
        itemType: {
            type: String,
            enum: ['Appointment', 'SymptomReport', 'none'],
            default: 'none'
        },
        itemId: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notification', notificationSchema);
