const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    clinicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic',
        required: true
    },

    specialization: {
        type: String,
        required: true
    },

    consultationDuration: {
        type: Number,
        required: true
    },

    isAvailable: {
        type: Boolean,
        default: true
    }

});

module.exports = mongoose.model('Doctor', doctorSchema);