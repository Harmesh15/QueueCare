const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");
const Doctor = require('../models/Doctor');
const User = require('../models/user');
const Clinic = require('../models/Clinic');


exports.createDoctor = async (req, res, next) => {
    let createdUser = null;

    try {
        const {
            name,
            email,
            password,
            clinicId,
            specialization,
            consultationDuration
        } = req.body;

        // 1. Validate required fields
        if (
            !name?.trim() ||
            !email?.trim() ||
            !password ||
            !clinicId ||
            !specialization?.trim() ||
            consultationDuration == null
        ) {
            return res.status(400).json({
                message: 'All doctor fields are required'
            });
        }

        // 2. Validate consultation duration
        const duration = Number(consultationDuration);

        if (!Number.isFinite(duration) || duration <= 0) {
            return res.status(400).json({
                message: 'Consultation duration must be a positive number'
            });
        }

        // 3. Validate clinic ID
        if (!mongoose.isValidObjectId(clinicId)) {
            return res.status(400).json({
                message: 'Invalid clinic ID'
            });
        }

        // 4. Check if clinic exists
        const clinic = await Clinic.findById(clinicId);

        if (!clinic) {
            return res.status(404).json({
                message: 'Clinic not found'
            });
        }

        // 5. Check duplicate email
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: 'Email is already registered'
            });
        }

        // 6. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 7. Create User account with doctor role
        createdUser = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'doctor'
        });

        // 8. Create Doctor profile linked to User
        const doctor = await Doctor.create({
            userId: createdUser._id,
            clinicId,
            specialization: specialization.trim(),
            consultationDuration: duration
        });

        // 9. Send response
        return res.status(201).json({
            message: 'Doctor created successfully',
            doctor: {
                _id: doctor._id,
                userId: createdUser._id,
                name: createdUser.name,
                email: createdUser.email,
                role: createdUser.role,
                clinicId: doctor.clinicId,
                specialization: doctor.specialization,
                consultationDuration: doctor.consultationDuration,
                isAvailable: doctor.isAvailable
            }
        });

    } catch (error) {
        // Roll back the newly created User if profile creation fails.
        if (createdUser) {
            try {
                await User.findByIdAndDelete(createdUser._id);
            } catch (cleanupError) {
                console.error(
                    'Failed to clean up doctor user:',
                    cleanupError
                );
            }
        }

        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Email is already registered'
            });
        }

        next(error);
    }
};






exports.getAllDoctors = async (req, res, next) => {
    try {
        const doctors = await Doctor.find()
                .populate('userId', 'name email')
                .populate('clinicId', 'name address');

        res.status(200).json({
            message: 'Doctors fetched successfully',
            count: doctors.length,
            doctors
        });

        } catch (error) {
            next(error);
   }
 };







 exports.getDoctorById = async (req, res, next) => {
        try {
            const doctor = await Doctor.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('clinicId', 'name address');

        if (!doctor) {
            return res.status(404).json({
                 message: 'Doctor not found'
             });
        }

        res.status(200).json({
            message: 'Doctor fetched successfully',
                doctor
                 });

            } catch (error) {
                next(error);
    }
};





exports.updateDoctor = async (req, res, next) => {
try {
            const {
            clinicId,
            specialization,
            consultationDuration,
            isAvailable
            } = req.body;

    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
        return res.status(404).json({
            message: 'Doctor not found'
        });
    }

    if (clinicId !== undefined) {
        const clinic = await Clinic.findById(clinicId);

        if (!clinic) {
            return res.status(404).json({
                message: 'Clinic not found'
            });
        }

        doctor.clinicId = clinicId;
    }

    if (specialization !== undefined) {
        doctor.specialization = specialization;
    }

    if (consultationDuration !== undefined) {
        if (
            !Number.isFinite(consultationDuration) ||
            consultationDuration <= 0
        ) {
            return res.status(400).json({
                message: 'Consultation duration must be a positive number'
            });
        }

        doctor.consultationDuration = consultationDuration;
    }

    if (isAvailable !== undefined) {
        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({
                message: 'isAvailable must be true or false'
            });
        }

        doctor.isAvailable = isAvailable;
    }

    await doctor.save();

    await doctor.populate([
        { path: 'userId', select: 'name email' },
        { path: 'clinicId', select: 'name address' }
    ]);

    res.status(200).json({
        message: 'Doctor updated successfully',
        doctor
    });

} catch (error) {
    next(error);
}
};




exports.deleteDoctor = async (req, res, next) => {
   try {
        const doctor = await Doctor.findById(req.params.id);

            if (!doctor) {
                return res.status(404).json({
                    message: 'Doctor not found'
                });
            }

            await Doctor.findByIdAndDelete(req.params.id);

            res.status(200).json({
                message: 'Doctor deleted successfully'
            });

        } catch (error) {
            next(error);
        }
};
