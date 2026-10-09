const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true
    },

    type: {
        type: String,
        enum: [
            'appointment_booked',
            'appointment_cancelled',
            'turn_approaching',
            'your_turn',
            'appointment_completed'
        ],
        required: true
    },

    message: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
    }

}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);