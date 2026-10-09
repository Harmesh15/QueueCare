const Doctor = require('../models/Doctor');
const User = require('../models/user');
const Clinic = require('../models/Clinic');

exports.createDoctor = async (req, res, next) => {
    try {
        const { userId, clinicId, specialization, consultationDuration } = req.body;

    if ( !userId || !clinicId || !specialization || consultationDuration == null ) {
        return res.status(400).json({
            message: 'All doctor fields are required'
        });
    }

    if (
        !Number.isFinite(consultationDuration) ||
        consultationDuration <= 0
    ) {
        return res.status(400).json({
            message: 'Consultation duration must be a positive number'
        });
    }

    const doctorUser = await User.findById(userId);

    if (!doctorUser || doctorUser.role !== 'doctor') {
        return res.status(400).json({
            message: 'A valid user with doctor role is required'
        });
    }

    const clinic = await Clinic.findById(clinicId);

    if (!clinic) {
        return res.status(404).json({
            message: 'Clinic not found'
        });
    }

    const existingDoctor = await Doctor.findOne({ userId });

    if (existingDoctor) {
        return res.status(409).json({
            message: 'Doctor profile already exists for this user'
        });
    }

    const doctor = await Doctor.create({
        userId,
        clinicId,
        specialization,
        consultationDuration
    });

    res.status(201).json({
        message: 'Doctor created successfully',
        doctor
    });

} catch (error) {
    next(error);
}
}







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
