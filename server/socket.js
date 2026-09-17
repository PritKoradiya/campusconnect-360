const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io = null;

/**
 * Initializes Socket.IO on the provided HTTP server.
 * Applies JWT authentication middleware and manages private user rooms.
 *
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    },
    transports: ['websocket', 'polling']
  });

  // JWT Authentication Middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers?.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        } else {
          token = authHeader;
        }
      }

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select('_id name email role');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userRoom = `user:${socket.user._id.toString()}`;
    socket.join(userRoom);

    socket.on('disconnect', () => {
      socket.leave(userRoom);
    });
  });

  return io;
};

/**
 * Returns the active Socket.IO server instance.
 * @returns {Server|null}
 */
const getIO = () => io;

/**
 * Emits an event to a specific user's authenticated private room.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} event
 * @param {Object} data
 * @returns {boolean}
 */
const emitToUser = (userId, event, data) => {
  if (!io) {
    return false;
  }

  const room = `user:${userId.toString()}`;
  io.to(room).emit(event, data);
  return true;
};

module.exports = {
  initSocket,
  getIO,
  emitToUser
};
