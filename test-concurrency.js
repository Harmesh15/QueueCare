
const axios = require('axios');

const url = 'http://localhost:3000/api/appointments';

const patientTokens = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWM3OGZhOWRmOTQwZjc0MWI1MjQ5ZjEiLCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTc5MTYyMjI2NywiZXhwIjoxNzkxNjI1ODY3fQ.jl95wVEBeL2FqZ3hw3oBCYfa2mDtdvW6-pSxCMkjWSA',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWM5ZmMwNTIwMTBjMzNiYzBiY2NhMTciLCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTc5MTYyMjE3NywiZXhwIjoxNzkxNjI1Nzc3fQ.m6cfC8K26Mbj0g3PlieXiWJjGmjL1V38l8Pvef73Qk0'
];

const baseBody = {
    doctorId: '6ac8836b7a093467890c3f37',
    clinicId: '6ac86600ca099dca0e998ac2',
    appointmentDate: '2026-10-14'
};

async function bookAppointment(token, patient, time) {
    try {
        const response = await axios.post(
            url,
            {
                ...baseBody,
                appointmentTime: time
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        console.log(
            patient,
            response.status,
            'Time:', time,
            'Token:', response.data.appointment?.tokenNumber
        );
    } catch (error) {
        console.log(
            patient,
            error.response?.status,
            'Time:', time,
            error.response?.data || error.message
        );
    }
}

Promise.all([
    bookAppointment(patientTokens[0], 'Patient A', '13:00'),
    bookAppointment(patientTokens[1], 'Patient B', '14:00')
]);