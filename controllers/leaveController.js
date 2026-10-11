const mongoose = require('mongoose');

const Doctor = require('../models/Doctor');
const DoctorLeave = require('../models/DoctorLeave');


// Validate YYYY-MM-DD and convert to India midnight
const parseIndiaDate = (value) => {
    if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return null;
    }

    const [year, month, day] = value.split('-').map(Number);

    const calendarDate = new Date(
        Date.UTC(year, month - 1, day)
    );

    if (
        calendarDate.getUTCFullYear() !== year ||
        calendarDate.getUTCMonth() !== month - 1 ||
        calendarDate.getUTCDate() !== day
    ) {
        return null;
    }

    return new Date(`${value}T00:00:00+05:30`);
};

// 1. Add a doctor's leave
exports.addDoctorLeave = async (req, res, next) => {
    try {
        const { doctorId, date, reason } = req.body;

        if (!doctorId || !date) {
            return res.status(400).json({
                message: 'Doctor ID and date are required'
            });
        }

        if (!mongoose.isValidObjectId(doctorId)) {
            return res.status(400).json({
                message: 'Invalid doctor ID'
            });
        }

        const leaveDate = parseIndiaDate(date);

        if (!leaveDate) {
            return res.status(400).json({
                message: 'Date must be a valid YYYY-MM-DD date'
            });
        }

        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            return res.status(404).json({
                message: 'Doctor not found'
            });
        }

        const leave = await DoctorLeave.create({
            doctorId,
            date: leaveDate,
            reason: reason || 'Doctor unavailable'
        });

        return res.status(201).json({
            message: 'Doctor leave added successfully',
            leave
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Leave already exists for this doctor and date'
            });
        }

        next(error);
    }
};

// 2. Get a doctor's leaves
exports.getDoctorLeaves = async (req, res, next) => {
    try {
        const { doctorId } = req.params;

        if (!mongoose.isValidObjectId(doctorId)) {
            return res.status(400).json({
                message: 'Invalid doctor ID'
            });
        }

        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            return res.status(404).json({
                message: 'Doctor not found'
            });
        }

        const leaves = await DoctorLeave.find({ doctorId })
            .sort({ date: 1 })
            .select('date reason');

        return res.status(200).json({
            doctorId,
            count: leaves.length,
            leaves
        });

    } catch (error) {
        next(error);
    }
};

// 3. Remove a leave entry
exports.deleteDoctorLeave = async (req, res, next) => {
    try {
        const { leaveId } = req.params;

        if (!mongoose.isValidObjectId(leaveId)) {
            return res.status(400).json({
                message: 'Invalid leave ID'
            });
        }

        const leave = await DoctorLeave.findByIdAndDelete(leaveId);

        if (!leave) {
            return res.status(404).json({
                message: 'Leave entry not found'
            });
        }

        return res.status(200).json({
            message: 'Doctor leave removed successfully'
        });

    } catch (error) {
        next(error);
    }
};
