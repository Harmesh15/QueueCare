const express = require('express');

const clinicController = require('../controllers/clinicController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('admin'), 
clinicController.createClinic);

router.get('/', clinicController.getAllClinics);

router.get('/:id', clinicController.getClinicById);


router.put('/:id', authMiddleware, roleMiddleware('admin'), 
clinicController.updateClinic);


router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware('admin'),
    clinicController.deleteClinic
);



module.exports = router;