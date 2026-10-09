const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    openingTime: {
        type: String,
        required: true
    },

    closingTime: {
        type: String,
        required: true
    }

});

module.exports = mongoose.model('Clinic', clinicSchema);