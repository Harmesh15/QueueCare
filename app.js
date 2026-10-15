require('dotenv').config();

const express = require("express");
const connectDb = require('./config/database');
const http = require('http');
const { Server } = require('socket.io');
const redisClient = require('./config/redis');
const cors = require("cors")
const path = require("path");


// Routes 

const authRoutes = require("./routes/authRoutes");
const clinicRoutes = require('./routes/clinicRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');

const app = express();
app.use(cors());
const server = http.createServer(app);


const io = new Server(server, {
    cors: {
        origin: '*'
    }
}); 

app.use(express.json());

// Frontend ki CSS, JS aur images serve karne ke liye
app.use(express.static(
    path.join(__dirname, 'QueueCare_Frontend')
));



app.get('/',(req,res)=>{
    res.sendFile(
        path.join(__dirname, "QueueCare_Frontend", 'index.html' )
    );
});


app.set('io', io);
require('./sockets/queueSocket')(io);

app.use('/api/auth',authRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', availabilityRoutes);


const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectDb();

        await redisClient.connect();
        const pong = await redisClient.ping();

        console.log('Redis PING successful:', pong);

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Startup failed:', error.message);
        process.exit(1);
    }
}

startServer();
