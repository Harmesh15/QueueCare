const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const DoctorAvailability = require('../models/DoctorAvailability');

const validDays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
];

const validTime = (time) =>
    typeof time === 'string' &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);

// Create or update a doctor's weekly schedule
exports.setWeeklyAvailability = async (req, res, next) => {
    try {
        const { doctorId, schedule } = req.body;

        if (!mongoose.isValidObjectId(doctorId)) {
            return res.status(400).json({
                message: 'Invalid doctor ID'
            });
        }

        if (!Array.isArray(schedule) || schedule.length === 0) {
            return res.status(400).json({
                message: 'Schedule must be a non-empty array'
            });
        }

        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            return res.status(404).json({
                message: 'Doctor not found'
            });
        }

        const seenDays = new Set();

        for (const day of schedule) {
            if (!validDays.includes(day.dayOfWeek)) {
                return res.status(400).json({
                    message: `Invalid weekday: ${day.dayOfWeek}`
                });
            }

            if (seenDays.has(day.dayOfWeek)) {
                return res.status(400).json({
                    message: `Duplicate weekday: ${day.dayOfWeek}`
                });
            }

            seenDays.add(day.dayOfWeek);

            if (typeof day.isAvailable !== 'boolean') {
                return res.status(400).json({
                    message: `isAvailable must be true or false for ${day.dayOfWeek}`
                });
            }

            if (
                day.isAvailable &&
                (
                    !validTime(day.startTime) ||
                    !validTime(day.endTime) ||
                    day.startTime >= day.endTime
                )
            ) {
                return res.status(400).json({
                    message: `Valid startTime and endTime are required for ${day.dayOfWeek}`
                });
            }
        }

        const operations = schedule.map(day => ({
            updateOne: {
                filter: {
                    doctorId,
                    dayOfWeek: day.dayOfWeek
                },
                update: {
                    $set: {
                        isAvailable: day.isAvailable,
                        startTime: day.isAvailable ? day.startTime : '00:00',
                        endTime: day.isAvailable ? day.endTime : '00:00'
                    }
                },
                upsert: true
            }
        }));

        await DoctorAvailability.bulkWrite(operations);

        const updatedSchedule = await DoctorAvailability.find({
            doctorId
        }).sort({ dayOfWeek: 1 });

        return res.status(200).json({
            message: 'Weekly availability saved successfully',
            schedule: updatedSchedule
        });

    } catch (error) {
        next(error);
    }
};



// Get a doctor's weekly schedule
exports.getWeeklyAvailability = async (req, res, next) => {
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

        const schedule = await DoctorAvailability.find({
            doctorId
        }).sort({ dayOfWeek: 1 });

        return res.status(200).json({
            doctorId,
            count: schedule.length,
            schedule
        });

    } catch (error) {
        next(error);
    
}
}