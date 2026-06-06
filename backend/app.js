const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // For development. In production, restrict to frontend domain.
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Basic route to verify server is running
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'MRMS API is running' });
});

// Mount routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/admins', require('./src/routes/adminRoutes'));
app.use('/api/doctors', require('./src/routes/doctorRoutes'));
app.use('/api/doctor', require('./src/routes/doctorRoutes')); // Alias for singular route requests
app.use('/api/patients', require('./src/routes/patientRoutes'));
app.use('/api/receptionists', require('./src/routes/receptionistRoutes'));
app.use('/api/receptionist/appointments', require('./src/routes/appointmentRoutes'));
app.use('/api/diagnoses', require('./src/routes/diagnosisRoutes'));
app.use('/api/dashboard', require('./src/routes/dashboardRoutes'));
app.use('/api/activities', require('./src/routes/activitiesRoutes'));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found on this server.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
});



module.exports = app;
