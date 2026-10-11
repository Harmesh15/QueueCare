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

appointmentSchema.index(
    {
        doctorId: 1,
        appointmentDate: 1,
        appointmentTime: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            status: {
                $in: ['booked', 'waiting', 'called']
            }
        }
    }
);



// module.exports = mongoose.model('Appointment', appointmentSchema);
module.exports =
    mongoose.models.Appointment ||
    mongoose.model('Appointment', appointmentSchema);

// mongoose.models.Appointment, ye existing compiled model m change karne par bhi dobara compile kar deta hai, 
// eske bina change ni kar payenge  ye Cannot overwrite `Appointment` model once compiled. ayega