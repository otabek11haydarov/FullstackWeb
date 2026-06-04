require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./src/models/index');

const PORT = process.env.PORT || 8000;

// Test DB connection and start server
console.log('Attempting to connect to the database and sync models...');

sequelize.sync({ alter: true }) // Sync models with database
  .then(() => {
    console.log('✅ Database connection has been established successfully and models are synced.');
    
    // Explicitly start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', err => {
      console.log('UNHANDLED REJECTION! 💥 Shutting down...');
      console.log(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database or sync models:', err);
    process.exit(1); // Exit process if DB connection fails
  });
