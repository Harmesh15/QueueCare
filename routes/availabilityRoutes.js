const express = require('express');

const availabilityController = require('../controllers/availabilityController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const leaveController = require('../controllers/leaveController');


const router = express.Router();

router.put(
    '/weekly',
    authMiddleware,
    roleMiddleware('admin'),
    availabilityController.setWeeklyAvailability
);

router.get(
    '/weekly/:doctorId',
    authMiddleware,
    roleMiddleware('admin'),
    availabilityController.getWeeklyAvailability
);


// Add leave for a specific date
router.post(
    '/leave',
    authMiddleware,
    roleMiddleware('admin'),
    leaveController.addDoctorLeave
);

// Get a doctor's leave schedule
router.get(
    '/leave/:doctorId',
    authMiddleware,
    roleMiddleware('admin'),
    leaveController.getDoctorLeaves
);

// Remove a leave entry
router.delete(
    '/leave/:leaveId',
    authMiddleware,
    roleMiddleware('admin'),
    leaveController.deleteDoctorLeave
);


module.exports = router;