import { io } from 'socket.io-client';

let socket = null;
let currentToken = null;

const getSocketURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return 'http://localhost:5000';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.replace(/\/api$/, '');
};

/**
 * Initializes or returns the authenticated Socket.IO connection.
 * Guarantees a single active connection per authenticated user.
 *
 * @param {string} [token]
 * @returns {import('socket.io-client').Socket|null}
 */
export const connectSocket = (token) => {
  const authToken = token || localStorage.getItem('token');

  if (!authToken) {
    disconnectSocket();
    return null;
  }

  // If already connected with the same token, return existing instance
  if (socket && currentToken === authToken && socket.connected) {
    return socket;
  }

  // If token changed or existing connection is stale, disconnect first
  if (socket) {
    disconnectSocket();
  }

  currentToken = authToken;

  socket = io(getSocketURL(), {
    auth: {
      token: authToken
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    timeout: 10000
  });

  return socket;
};

/**
 * Disconnects the socket and clears state.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
};

/**
 * Returns the current active socket instance if any.
 * @returns {import('socket.io-client').Socket|null}
 */
export const getSocket = () => socket;

/**
 * Subscribes to new notification events.
 *
 * @param {Function} callback - Callback accepting notification object
 */
export const onNotification = (callback) => {
  if (!socket) {
    const s = connectSocket();
    if (!s) return;
  }

  socket.on('notification:new', callback);
};

/**
 * Unsubscribes from new notification events.
 *
 * @param {Function} callback
 */
export const offNotification = (callback) => {
  if (socket) {
    socket.off('notification:new', callback);
  }
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  onNotification,
  offNotification
};
