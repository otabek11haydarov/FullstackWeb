require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./src/models/index');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 8000;

// Initialize HTTP server and Socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

// Initialize global socket utility
require('./src/utils/socketIO').init(io);

// Test DB connection and start server
console.log('Attempting to connect to the database and sync models...');

sequelize.sync({ alter: true }) // Sync models with database
  .then(() => {
    console.log('✅ Database connection has been established successfully and models are synced.');
    
    // Explicitly start the server
    server.listen(PORT, () => {
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
