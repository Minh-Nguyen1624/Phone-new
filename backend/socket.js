// socket.js
let io;

module.exports = {
  init: (server) => {
    if (io) {
      console.warn("Socket.IO is already initialized.");
      return io;
    }
    io = require("socket.io")(server);
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.IO not initialized. Call init() first.");
    }
    return io;
  },
};
