const express = require("express");
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const loginRateLimiter = require('../middleware/loginRateLimiter');
const router = express.Router();

router.post("/register",authController.register);

router.post('/login',loginRateLimiter, authController.login);

router.get('/profile', authMiddleware, (req, res) => {
    res.json({
        message: 'You are authenticated',
        user: req.user
    });
});

router.get('/admin-test',authMiddleware, roleMiddleware('admin'),
    (req, res) => {
        res.json({
            message: 'Welcome Admin'
        });
    }
);

module.exports = router;