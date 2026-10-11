const express = require('express');

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



router.patch(
    '/call-next',
    authMiddleware,
    roleMiddleware('doctor'),
    appointmentController.callNextPatient
);

module.exports = router;
