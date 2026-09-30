import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
const getSocketUrl = () => {
  if (!configuredSocketUrl) return window.location.origin;
  // Avoid sending a phone browser to its own localhost when a stale dev env
  // points at localhost but the page was opened from another device.
  try {
    const configured = new URL(configuredSocketUrl, window.location.origin);
    const pageHost = window.location.hostname;
    const isRemoteDevice = pageHost !== 'localhost' && pageHost !== '127.0.0.1';
    if (isRemoteDevice && ['localhost', '127.0.0.1'].includes(configured.hostname)) {
      return window.location.origin;
    }
  } catch (_) {}
  return configuredSocketUrl;
};

export const SocketProvider = ({ children }) => {
  const { token, loading: authLoading, logout } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (authLoading) return undefined;

    const urlParams = new URLSearchParams(window.location.search);
    const pairingToken = urlParams.get('pairingToken') || urlParams.get('token');

    if (!token && !pairingToken) {
      setSocket(null);
      setIsConnected(false);
      return undefined;
    }

    const newSocket = io(getSocketUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: { token: token || undefined, pairingToken: pairingToken || undefined },
    });

    const handleConnect = () => {
      console.log('[Socket.IO] Connected:', newSocket.id);
      setIsConnected(true);
    };
    const handleDisconnect = (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      setIsConnected(false);
    };
    const handleConnectError = (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
      setIsConnected(false);
      // Do not log out for ordinary LAN/offline/WebSocket failures. The server
      // explicitly reports authentication errors when credentials are invalid.
      if (/authentication|token|unauthorized/i.test(err.message || '')) logout?.();
    };
    const handleAuthError = (payload) => {
      console.warn('[Socket.IO] Authentication error:', payload?.message || 'unknown');
      logout?.();
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('auth-error', handleAuthError);
    setSocket(newSocket);

    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.off('auth-error', handleAuthError);
      newSocket.disconnect();
    };
  }, [token, authLoading, logout]);

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

export default SocketContext;
