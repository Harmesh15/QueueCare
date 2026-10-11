const mongoose = require('mongoose');

const doctorLeaveSchema = new mongoose.Schema(
    {
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            required: true
        },

        date: {
            type: Date,
            required: true
        },

        reason: {
            type: String,
            trim: true,
            default: 'Doctor unavailable'
        }
    },
    { timestamps: true }
);

// Prevent duplicate leave entries for the same doctor and date
doctorLeaveSchema.index(
    { doctorId: 1, date: 1 },
    { unique: true }
);

module.exports = mongoose.model('DoctorLeave', doctorLeaveSchema);
