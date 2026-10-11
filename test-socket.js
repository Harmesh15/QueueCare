
require('dotenv').config();
const { io } = require('socket.io-client');

const DOCTOR_TOKEN = process.env.TEST_DOCTOR_TOKEN;
const doctorId = '6ac8836b7a093467890c3f37';

const socket = io('http://localhost:3000', {
    auth: {
        token: DOCTOR_TOKEN
    }
});

socket.on('connect', () => {
    console.log('Connected to server:', socket.id);

    socket.emit('joinQueue', doctorId, (response) => {
        console.log('Join queue response:', response);
    });
});

socket.on('queueUpdated', (data) => {
    console.log('Live queue update received:', data);
});

socket.on('connect_error', (error) => {
    console.log('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
});