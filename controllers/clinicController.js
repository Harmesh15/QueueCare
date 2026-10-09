const Clinic = require('../models/Clinic');
const mongoose = require('mongoose');

exports.createClinic = async (req, res, next) => {
    try {
        const { name, address, phone, openingTime, closingTime } = req.body;

        if (!name || !address || !phone || !openingTime || !closingTime
        ) {
            return res.status(400).json({
                message: 'All clinic fields are required'
            });
        }

        const clinic = await Clinic.create({
            name,
            address,
            phone,
            openingTime,
            closingTime
        });

        res.status(201).json({
            message: 'Clinic created successfully',
            clinic
        });

    } catch (error) {
        next(error);
    }
};



exports.getAllClinics = async (req, res, next) => {
    try {
        const clinics = await Clinic.find();

        res.status(200).json({
            message: 'Clinics fetched successfully',
            clinics
        });

    } catch (error) {
        next(error);
    }
};



exports.getClinicById = async (req, res, next) => {
    try {
        const clinic = await Clinic.findById(req.params.id);

        if (!clinic) {
            return res.status(404).json({
                message: 'Clinic not found'
            });
        }

        res.status(200).json({
            message: 'Clinic fetched successfully',
            clinic
        });

    } catch (error) {
        next(error);
    }
};





exports.updateClinic = async (req, res, next) => {
    try {
        const { name, address, phone, openingTime, closingTime } = req.body;

        const clinic = await Clinic.findById(req.params.id);

        if (!clinic) {
            return res.status(404).json({
                message: 'Clinic not found'
            });
        }

        clinic.name = name ?? clinic.name;
        clinic.address = address ?? clinic.address;
        clinic.phone = phone ?? clinic.phone;
        clinic.openingTime = openingTime ?? clinic.openingTime;
        clinic.closingTime = closingTime ?? clinic.closingTime;

        await clinic.save();

        res.status(200).json({
            message: 'Clinic updated successfully',
            clinic
        });

    } catch (error) {
        next(error);
    }
};



exports.deleteClinic = async (req, res, next) => {
    try {
        const clinic = await Clinic.findById(req.params.id);

        if (!clinic) {
            return res.status(404).json({
                message: 'Clinic not found'
            });
        }

        await Clinic.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message: 'Clinic deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};