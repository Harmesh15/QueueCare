const mongoose = require('mongoose');

const Appointment = require('../models/appointment');
const User = require("../models/user");
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const redisClient = require('../config/redis');
const emailQueue = require('../queues/emailQueue');

const DoctorAvailability = require('../models/DoctorAvailability');
const DoctorLeave = require('../models/DoctorLeave');
const QueueCounter = require('../models/QueueCounter');
const { callNextPatient } = require('../services/queueService');


exports.bookAppointment = async (req, res, next) => {
    try {
        const {doctorId, clinicId, appointmentDate, appointmentTime } = req.body;

        // 1. Required fields validation
        if (!doctorId || !clinicId || !appointmentDate || !appointmentTime) {
            return res.status(400).json({
                message: 'Doctor, clinic, date and time are required'
            });
        }

        // 2. Validate IDs
        if (
            !mongoose.isValidObjectId(doctorId) ||
            !mongoose.isValidObjectId(clinicId)
        ) {
            return res.status(400).json({
                message: 'Invalid doctor or clinic ID'
            });
        }

        // 3. Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
            return res.status(400).json({
                message: 'Appointment date must use YYYY-MM-DD format'
            });
        }

        const [year, month, day] = appointmentDate.split('-').map(Number);

        const calendarDate = new Date(Date.UTC(year, month - 1, day));

        if (
            calendarDate.getUTCFullYear() !== year ||
            calendarDate.getUTCMonth() !== month - 1 ||
            calendarDate.getUTCDate() !== day
        ) {
            return res.status(400).json({
                message: 'Invalid appointment date'
            });
        }

        // 4. Validate time format
        if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(appointmentTime)) {
            return res.status(400).json({
                message: 'Appointment time must use HH:mm format'
            });
        }

        // 5. Reject past date/time using India timezone
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(new Date());

        const getPart = (type) =>
            parts.find(part => part.type === type).value;

        const today =
            `${getPart('year')}-${getPart('month')}-${getPart('day')}`;

        const currentTime =
            `${getPart('hour')}:${getPart('minute')}`;

        if (
            appointmentDate < today ||
            (appointmentDate === today && appointmentTime <= currentTime)
        ) {
            return res.status(400).json({
                message: 'Appointment date and time must be in the future'
            });
        }

        // 6. Normalize date to India midnight
        const date = new Date(
            `${appointmentDate}T00:00:00+05:30`
        );

        // 7. Check doctor availability
        const doctor = await Doctor.findById(doctorId);

        if (!doctor || !doctor.isAvailable) {
            return res.status(404).json({
                message: 'Doctor not found or unavailable'
            });
        }

        // 8. Verify doctor belongs to selected clinic
        if (doctor.clinicId.toString() !== clinicId) {
            return res.status(400).json({
                message: 'Doctor does not belong to this clinic'
            });
        }

        // 9. Check clinic exists
        const clinic = await Clinic.findById(clinicId);

        if (!clinic) {
            return res.status(404).json({
                message: 'Clinic not found'
            });
        }

        // 10. Check weekly availability
        const weekdays = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];

        const dayOfWeek = weekdays[
            new Date(`${appointmentDate}T00:00:00Z`).getUTCDay()
        ];

        const schedule = await DoctorAvailability.findOne({
            doctorId,
            dayOfWeek
        });

        if (!schedule || !schedule.isAvailable) {
            return res.status(400).json({
                message: 'Doctor is not available on this weekday'
            });
        }

        // 11. Check doctor leave for selected date
        const leave = await DoctorLeave.findOne({
            doctorId,
            date
        });

        if (leave) {
            return res.status(400).json({
                message: 'Doctor is on leave on this date'
            });
        }


        //// yaha se 

         const session = await mongoose.startSession();

           let appointment;

              try {
                   await session.withTransaction(async () => {

        // 1. Check whether the slot is already booked
            const existingAppointment = await Appointment.findOne({
             doctorId,
            appointmentDate: date,
            appointmentTime,
            status: {
                $nin: ['cancelled', 'skipped']
            }
        }).session(session);

        if (existingAppointment) {
            const error = new Error(
                'This doctor already has an appointment at that time'
            );
            error.statusCode = 409;
            throw error;
        }

        // 2. Find the highest token already assigned
        const lastAppointment = await Appointment.findOne({
            doctorId,
            appointmentDate: date
        })
            .sort({ tokenNumber: -1 })
            .session(session);

        const lastExistingToken = lastAppointment
            ? lastAppointment.tokenNumber
            : 0;

        // 3. Sync counter with existing appointments
        await QueueCounter.findOneAndUpdate(
            {
                doctorId,
                appointmentDate: date
            },
            {
                $max: {
                    lastTokenNumber: lastExistingToken
                }
            },
            {
                upsert: true,
                new: true,
                session,
                setDefaultsOnInsert: true
            }
        );

        // 4. Atomically generate the next token
        const counter = await QueueCounter.findOneAndUpdate(
            {
                doctorId,
                appointmentDate: date
            },
            {
                $inc: {
                    lastTokenNumber: 1
                }
            },
            {
                new: true,
                session
            }
        );

        // 5. Create the appointment in the same transaction
        const createdAppointments = await Appointment.create(
            [{
                patientId: req.user.userId,
                doctorId,
                clinicId,
                appointmentDate: date,
                appointmentTime,
                tokenNumber: counter.lastTokenNumber
            }],
            { session }
        );

        appointment = createdAppointments[0];
    });

    // Email send code

    const patient = await User.findById(req.user.userId).select('email name');

            if (patient?.email) {
                await emailQueue.add(
                    'appointment-confirmation',
                    {
                        to: patient.email,
                        subject: 'QueueCare - Appointment Confirmation',
                        text: `Hello ${patient.name || 'Patient'},

            Your appointment has been booked successfully.
            Appointment Date: ${appointmentDate}
            Appointment Time: ${appointmentTime}
            Token Number: ${appointment.tokenNumber}

            Please arrive on time.

            Thank you,
            QueueCare`
                    },
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000
                        },
                        removeOnComplete: true
                    }
                );

                console.log('Appointment confirmation email job added');
            } else {
                console.log('Patient email not found; confirmation email skipped');
            }




    const cacheKey = `appointments:patient:${req.user.userId}`;
     await redisClient.del(cacheKey);
        console.log('Cache invalidated after booking:', cacheKey);

    return res.status(201).json({
        message: 'Appointment booked successfully',
        appointment
    });

} catch (error) {
    if (error.statusCode === 409 || error.code === 11000) {
        return res.status(409).json({
            message: 'This appointment slot has already been booked'
        });
    }

    return next(error);

    } finally {
        await session.endSession();
    }
    } catch (error) {
            next(error);
    }
};



///// Get Appointments //////////////

exports.getMyAppointments = async (req, res, next) => {
    
    try {
        const patientId = req.user.userId;

        // 1. Patient-specific Redis key
        const cacheKey = `appointments:patient:${patientId}`;

        // 2. Check Redis cache
        const cachedData = await redisClient.get(cacheKey);
    

        // 3. Cache hit
        if (cachedData) {
            console.log('Cache HIT:', cacheKey);

            const appointments = JSON.parse(cachedData);

            return res.status(200).json({
                message: 'Your appointments fetched successfully',
                count: appointments.length,
                appointments
            });
        }

        console.log('Cache MISS:', cacheKey);

        // 4. Cache miss: fetch from MongoDB
        const appointments = await Appointment.find({
            patientId
        })
            .select(
                'appointmentDate appointmentTime tokenNumber status doctorId clinicId'
            )
            .populate({
                path: 'doctorId',
                select: 'userId specialization consultationDuration',
                populate: {
                    path: 'userId',
                    select: 'name'
                }
            })
            .populate('clinicId', 'name address')
            .sort({
                appointmentDate: 1,
                appointmentTime: 1
            });

        // 5. Format response data
        const formattedAppointments = appointments.map(appointment => ({
            appointmentId: appointment._id,
            date: appointment.appointmentDate,
            time: appointment.appointmentTime,
            tokenNumber: appointment.tokenNumber,
            status: appointment.status,

            doctor: appointment.doctorId
                ? {
                    name: appointment.doctorId.userId
                        ? appointment.doctorId.userId.name
                        : 'Name unavailable',
                    specialization: appointment.doctorId.specialization,
                    consultationDuration:
                        appointment.doctorId.consultationDuration
                }
                : null,

            clinic: appointment.clinicId
                ? {
                    name: appointment.clinicId.name,
                    address: appointment.clinicId.address
                }
                : null
        }));

        // 6. Store formatted data in Redis for 30 seconds
        await redisClient.set(
            cacheKey,
            JSON.stringify(formattedAppointments),
            { EX: 30 }
        );

        // 7. Return response
        return res.status(200).json({
            message: 'Your appointments fetched successfully',
            count: formattedAppointments.length,
            appointments: formattedAppointments
        });

    } catch (error) {
        next(error);
    }
};




exports.cancelAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate appointment ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid appointment ID'
            });
        }

        // Find appointment belonging to the logged-in patient
        const appointment = await Appointment.findOne({
            _id: id,
            patientId: req.user.userId
        });

        if (!appointment) {
            return res.status(404).json({
                message: 'Appointment not found'
            });
        }

        // Only active appointments can be cancelled
        if (
            ['completed', 'cancelled', 'skipped'].includes(
                appointment.status
            )
        ) {
            return res.status(400).json({
                message: `Cannot cancel an appointment with status: ${appointment.status}`
            });
        }

        // Update status instead of deleting the record
        appointment.status = 'cancelled';
        await appointment.save();


       // Invalidate the patient's appointments cache
        const cacheKey = `appointments:patient:${req.user.userId}`;
            await redisClient.del(cacheKey);

             console.log('Cache invalidated:', cacheKey);

        return res.status(200).json({
            message: 'Appointment cancelled successfully',
            appointment: {
                appointmentId: appointment._id,
                date: appointment.appointmentDate,
                time: appointment.appointmentTime,
                tokenNumber: appointment.tokenNumber,
                status: appointment.status
            }
        });

    } catch (error) {
        next(error);
    }
};


// Get available appointment slots for a doctor on a selected date
exports.getAvailableSlots = async (req, res, next) => {
    try {
        const { doctorId, date: selectedDate } = req.query;

        // 1. Validate required parameters
        if (!doctorId || !selectedDate) {
            return res.status(400).json({
                message: 'Doctor ID and date are required'
            });
        }

        if (!mongoose.isValidObjectId(doctorId)) {
            return res.status(400).json({
                message: 'Invalid doctor ID'
            });
        }

        // 2. Validate date format and actual calendar date
        if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
            return res.status(400).json({
                message: 'Date must use YYYY-MM-DD format'
            });
        }

        const [year, month, day] = selectedDate
            .split('-')
            .map(Number);

        const calendarDate = new Date(
            Date.UTC(year, month - 1, day)
        );

        if (
            calendarDate.getUTCFullYear() !== year ||
            calendarDate.getUTCMonth() !== month - 1 ||
            calendarDate.getUTCDate() !== day
        ) {
            return res.status(400).json({
                message: 'Invalid calendar date'
            });
        }

        const appointmentDate = new Date(
            `${selectedDate}T00:00:00+05:30`
        );

        // 3. Check current date and time in India
        const timeZone = 'Asia/Kolkata';

        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(new Date());

        const getPart = type =>
            parts.find(part => part.type === type).value;

        const today =
            `${getPart('year')}-${getPart('month')}-${getPart('day')}`;

        const currentTime =
            `${getPart('hour')}:${getPart('minute')}`;

        if (selectedDate < today) {
            return res.status(400).json({
                message: 'Cannot check slots for a past date'
            });
        }

        // 4. Find doctor
        const doctor = await Doctor.findById(doctorId);

        if (!doctor || !doctor.isAvailable) {
            return res.status(404).json({
                message: 'Doctor not found or unavailable'
            });
        }

        // 5. Find clinic
        const clinic = await Clinic.findById(doctor.clinicId);

        if (!clinic) {
            return res.status(404).json({
                message: 'Clinic not found'
            });
        }

        // 6. Find weekday for the selected calendar date
        const weekdays = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];

        const dayOfWeek = weekdays[
            new Date(`${selectedDate}T00:00:00Z`).getUTCDay()
        ];

        // 7. Check doctor's weekly schedule
        const schedule = await DoctorAvailability.findOne({
            doctorId,
            dayOfWeek
        });

        if (!schedule || !schedule.isAvailable) {
            return res.status(200).json({
                message: 'Doctor is not available on this day',
                doctor: doctorId,
                date: selectedDate,
                availableSlots: []
            });
        }

        // 8. Check whether doctor has leave on this date
        const leave = await DoctorLeave.findOne({
            doctorId,
            date: appointmentDate
        });

        if (leave) {
            return res.status(200).json({
                message: 'Doctor is on leave on this date',
                doctor: doctorId,
                date: selectedDate,
                availableSlots: []
            });
        }

        // 9. Convert HH:mm into minutes after midnight
        const toMinutes = time => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const toTime = minutes => {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;

            return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        };

        // 10. Combine doctor and clinic working hours
        const startMinutes = Math.max(
            toMinutes(schedule.startTime),
            toMinutes(clinic.openingTime)
        );

        const endMinutes = Math.min(
            toMinutes(schedule.endTime),
            toMinutes(clinic.closingTime)
        );

        const duration = doctor.consultationDuration;

        if (
            !Number.isInteger(duration) ||
            duration <= 0 ||
            startMinutes >= endMinutes
        ) {
            return res.status(200).json({
                message: 'No valid appointment slots available',
                doctor: doctorId,
                date: selectedDate,
                availableSlots: []
            });
        }

        // 11. Get existing appointments for this doctor and date
        const bookedAppointments = await Appointment.find({
            doctorId,
            appointmentDate,
            status: {
                $nin: ['cancelled', 'skipped']
            }
        }).select('appointmentTime');

        const bookedTimes = new Set(
            bookedAppointments.map(item => item.appointmentTime)
        );

        // 12. Generate available slots
        const availableSlots = [];

        for (
            let slotStart = startMinutes;
            slotStart + duration <= endMinutes;
            slotStart += duration
        ) {
            const slotTime = toTime(slotStart);

            // Exclude past/current-minute slots today
            if (
                selectedDate === today &&
                slotTime <= currentTime
            ) {
                continue;
            }

            // Exclude already-booked slots
            if (bookedTimes.has(slotTime)) {
                continue;
            }

            availableSlots.push(slotTime);
        }

        // 13. Return minimal useful information
        return res.status(200).json({
            message: availableSlots.length
                ? 'Available slots fetched successfully'
                : 'No available slots for this date',
            date: selectedDate,
            doctor: {
                id: doctor._id,
                name: (await doctor.populate({
                    path: 'userId',
                    select: 'name'
                })).userId?.name || 'Name unavailable',
                specialization: doctor.specialization
            },
            clinic: {
                name: clinic.name,
                address: clinic.address
            },
            consultationDuration: duration,
            availableSlots
        });

    } catch (error) {
        next(error);
    }
};




exports.callNextPatient = async (req, res, next) => {
    try {
        // Find the Doctor profile linked to the logged-in user
        const doctor = await Doctor.findOne({
            userId: req.user.userId
        });

        if (!doctor) {
            return res.status(404).json({
                message: 'Doctor profile not found'
            });
        }

        // Use today's date in India timezone
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(new Date());

        const getPart = (type) =>
            parts.find(part => part.type === type).value;

        const today = new Date(
            `${getPart('year')}-${getPart('month')}-${getPart('day')}T00:00:00+05:30`
        );

        const appointment = await callNextPatient(
            doctor._id,
            today
        );

        if (!appointment) {
            return res.status(404).json({
                message: 'No waiting patients in your queue'
            });
        }


        // Invalidate the called patient's appointments cache
       const cacheKey = `appointments:patient:${appointment.patientId}`;
          await redisClient.del(cacheKey);

            console.log('Cache invalidated after calling patient:', cacheKey);



        // Notify clients in this doctor's queue room
        const io = req.app.get('io');

        io.to(`queue:${doctor._id}`).emit('queueUpdated', {
            doctorId: doctor._id,
            appointmentId: appointment._id,
            tokenNumber: appointment.tokenNumber,
            status: appointment.status
        });

        return res.status(200).json({
            message: 'Next patient called successfully',
            appointment
        });
    } catch (error) {
        next(error);
    }
};



