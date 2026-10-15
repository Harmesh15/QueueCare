const express = require('express');
console.log("appointment route hit");

const appointmentController = require('../controllers/appointmentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.post(
'/',
authMiddleware,
roleMiddleware('patient'),
appointmentController.bookAppointment
);


router.delete("/delete/:id",
    authMiddleware,
    roleMiddleware('admin'),
    appointmentController.deleteAppointment
)

// Admin route
router.get(
    '/adminRoute',
    authMiddleware,
    roleMiddleware('admin'),
    appointmentController.getMyAppointments
);

router.get(
    '/my-appointments',
    authMiddleware,
    roleMiddleware('patient'),
    appointmentController.getMyAppointments
);


router.patch( '/:id/cancel',
     authMiddleware,
     roleMiddleware('patient'),
     appointmentController.cancelAppointment
);


router.get( '/available-slots', appointmentController.getAvailableSlots );

// doctors routes


router.patch(
    '/call-next',
    authMiddleware,
    roleMiddleware('doctor'),
    appointmentController.callNextPatient
);

router.get(
    "/doctor/my-appointments",
    authMiddleware,
    roleMiddleware("doctor"),
    appointmentController.getDoctorAppointments
);


router.patch(
    "/:id/status",
    authMiddleware,
    roleMiddleware("doctor"),
    appointmentController.updateAppointmentStatus
);


// update queueposition by callNext

router.get(
    "/my-queue-status/:appointmentId",
    authMiddleware,
    roleMiddleware("patient"),
    appointmentController.getMyQueueStatus
);



module.exports = router;
