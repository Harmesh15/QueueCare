const express = require('express');

const doctorController = require('../controllers/doctorController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();


router.get('/', doctorController.getAllDoctors );

router.get('/:id',
    doctorController.getDoctorById
);

router.post( '/',
authMiddleware,
roleMiddleware('admin'),
doctorController.createDoctor 
);


router.put(
    '/:id',
    authMiddleware,
    roleMiddleware('admin'),
    doctorController.updateDoctor
);


router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware('admin'),
    doctorController.deleteDoctor
);



module.exports = router;
