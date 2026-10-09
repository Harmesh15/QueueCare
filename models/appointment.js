const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },

    clinicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic',
        required: true
    },

    appointmentDate: {
        type: Date,
        required: true
    },

    appointmentTime: {
        type: String,
        required: true
    },

    tokenNumber: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: [
            'booked',
            'waiting',
            'called',
            'completed',
            'cancelled',
            'skipped'
        ],
        default: 'booked'
    },

    priority: {
        type: String,
        enum: ['normal', 'emergency'],
        default: 'normal'
    }

}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);