
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});

const emailQueue = new Queue('emailQueue', {
    connection
});

module.exports = emailQueue;



























// Ye code kya karta hai?

// Queue: background jobs manage karta hai.

// IORedis: BullMQ ko tumhare Redis Cloud se connect karta hai.

// emailQueue: email jobs ko queue mein store karega.

// maxRetriesPerRequest: null: BullMQ ke Redis connection ke liye required configuration hai.

// Abhi app.js mein import mat karna. Pehle file save karke batao ki koi error toh nahi aa raha.
//  Agle step mein background worker banayenge jo queue se job lekar email bhejega.