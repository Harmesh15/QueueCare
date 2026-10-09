require('dotenv').config();
const express = require("express");
const connectDb = require('./config/database');

// Routes 

const authRoutes = require("./routes/authRoutes");
const clinicRoutes = require('./routes/clinicRoutes');
const doctorRoutes = require('./routes/doctorRoutes');

const app = express();
app.use(express.json());

connectDb();

app.use('/api/auth',authRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/doctors', doctorRoutes);

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
