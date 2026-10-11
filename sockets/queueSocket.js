
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');

module.exports = (io) => {

    // 1. Authenticate every Socket.IO connection
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            socket.user = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            next();
        } catch (error) {
            next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        console.log('Authenticated client connected:', socket.id);

        // 2. Allow a doctor to join only their own queue
        socket.on('joinQueue', async (doctorId, callback) => {
            try {
                if (!mongoose.isValidObjectId(doctorId)) {
                    return callback?.({
                        success: false,
                        message: 'Invalid doctor ID'
                    });
                }

                if (socket.user.role !== 'doctor') {
                    return callback?.({
                        success: false,
                        message: 'Only doctors can join queues for now'
                    });
                }

                const doctor = await Doctor.findOne({
                    _id: doctorId,
                    userId: socket.user.userId
                });

                if (!doctor) {
                    return callback?.({
                        success: false,
                        message: 'You can only join your own queue'
                    });
                }

                socket.join(`queue:${doctor._id}`);

                console.log(
                    `Doctor joined own queue: ${doctor._id}`
                );

                return callback?.({
                    success: true,
                    message: 'Joined your queue successfully'
                });

            } catch (error) {
                console.error('joinQueue error:', error);

                return callback?.({
                    success: false,
                    message: 'Unable to join queue'
                });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};