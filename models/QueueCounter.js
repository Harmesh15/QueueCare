const mongoose = require('mongoose');

const queueCounterSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },

    appointmentDate: {
        type: Date,
        required: true
    },

    lastTokenNumber: {
        type: Number,
        default: 0,
        min: 0
    }
}, { timestamps: true });

queueCounterSchema.index(
    { doctorId: 1, appointmentDate: 1 },
    { unique: true }
);

module.exports = mongoose.model('QueueCounter', queueCounterSchema);