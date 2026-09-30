import { io } from 'socket.io-client';

let socket = null;

export const initSocket = ({ serverUrl = 'http://localhost:5001', token = null, userName = 'Nitesh (Lead)', role = 'COMPANY' } = {}) => {
  if (socket && socket.connected) {
    return socket;
  }

  if (!token) {
    throw new Error('A valid authentication token is required before opening an application socket.');
  }

  const authPayload = { token };

  socket = io(serverUrl, {
    auth: authPayload,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to server successfully with ID:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket Connection Error]:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const joinRoom = (roomId) => {
  if (socket && socket.connected) {
    socket.emit('join-room', { roomId });
  }
};

export const emitCodeChange = (roomId, code) => {
  if (socket && socket.connected) {
    socket.emit('code-change', { roomId, code });
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
