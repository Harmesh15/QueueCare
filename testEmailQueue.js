
require('dotenv').config();

const emailQueue = require('./queues/emailQueue');

async function sendTestEmail() {
    try {
        const job = await emailQueue.add(
            'send-test-email',
            {
                to: process.env.EMAIL_USER,
                subject: 'QueueCare BullMQ Test',
                text: 'Success! QueueCare background email queue is working.'
            },
            {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                },
                removeOnComplete: true
            }
        );

        console.log('Email job added to queue:', job.id);
    } catch (error) {
        console.error('Failed to add email job:', error.message);
    }
}

sendTestEmail();