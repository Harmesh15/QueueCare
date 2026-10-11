
const redisClient = require('../config/redis');

const loginRateLimiter = async (req, res, next) => {
    try {
        const ip = req.ip;
        const key = `login:failed:${ip}`;

        const attempts = Number(await redisClient.get(key)) || 0;
        console.log('Rate limiter IP:', ip);
        console.log('Failed attempts in Redis:', attempts);

        if (attempts >= 5) {
            return res.status(429).json({
                message: 'Too many failed login attempts. Try again after 1 minute.'
            });
        }

        req.loginRateLimitKey = key;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = loginRateLimiter;




















// Ye code kya kar raha hai?

// req.ip — request bhejne wale IP ko identify karta hai.

// login:failed:${ip} — har IP ke failed attempts ke liye alag Redis key.

// redisClient.get(key) — Redis se current failed-attempt count read karta hai.

// attempts >= 5 — 5 failed attempts ke baad request ko 429 response deta hai.

// req.loginRateLimitKey — Redis key controller ko provide karta hai, taaki failed login par count badhaya ja sake.