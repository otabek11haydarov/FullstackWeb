const socketIO = require('./socketIO');

async function logActivity(message, userInitial = 'SYS') {
  try {
    const { Activity } = require('../models');
    const activity = await Activity.create({ message, userInitial });
    const io = socketIO.getIO();
    if (io) {
      io.emit('globalActivity', {
        id: activity.id,
        message: activity.message,
        userInitial: activity.userInitial,
        createdAt: activity.createdAt,
        user: userInitial === 'SYS' ? 'System' : 'User'
      });
    }
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

module.exports = logActivity;
