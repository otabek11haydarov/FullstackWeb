let ioInstance = null;

module.exports = {
  init: (io) => {
    ioInstance = io;
  },
  getIO: () => {
    if (!ioInstance) {
      console.warn("Socket.io has not been initialized yet.");
    }
    return ioInstance;
  }
};
