
require('dotenv').config();

const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const transporter = require('../config/email');

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});

const emailWorker = new Worker(
    'emailQueue',
    async (job) => {
        const { to, subject, text } = job.data;

        const result = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text
        });

        console.log('Email sent successfully:', result.messageId);
        return { messageId: result.messageId };
    },
    { connection }
);

emailWorker.on('completed', (job) => {
    console.log(`Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`Email job ${job?.id} failed:`, err.message);
});

console.log('Email worker is running...');





///
// Iska role

// Worker Redis queue se job uthata hai.

// job.data mein recipient, subject aur message aayega.

// sendMail() email send karega.

// completed aur failed events job ka status batayenge.
//