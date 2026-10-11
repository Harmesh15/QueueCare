const mongoose = require('mongoose');

const doctorAvailabilitySchema = new mongoose.Schema(
    {
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            required: true
        },

        dayOfWeek: {
            type: String,
            enum: [
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
                'Sunday'
            ],
            required: true
        },

        isAvailable: {
            type: Boolean,
            default: true
        },

        startTime: {
            type: String,
            required: true
        },

        endTime: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

// One weekly schedule per doctor per weekday
doctorAvailabilitySchema.index(
    { doctorId: 1, dayOfWeek: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    'DoctorAvailability',
    doctorAvailabilitySchema
);