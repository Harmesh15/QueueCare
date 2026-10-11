require('dotenv').config();
const transporter = require('./config/email');

async function testEmail() {
    try {
        const result = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 'QueueCare Email Test',
            text: 'QueueCare email configuration is working!'
        });

        console.log('Test email sent:', result.messageId);
    } catch (error) {
        console.error('Email test failed:', error.message);
    }
}

testEmail();