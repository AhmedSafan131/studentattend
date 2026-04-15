import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

export const useSocketController = (user) => {
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setSocketConnected(false);
      setSocketError(false);
      socketRef.current = null;
      return undefined;
    }

    const nextSocket = io(SOCKET_URL, {
      query: { clientType: user.userRole === 'student' ? 'student' : 'dashboard' },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketRef.current = nextSocket;
    setSocket(nextSocket);

    const handleConnect = () => {
      setSocketConnected(true);
      setSocketError(false);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleConnectError = () => {
      setSocketError(true);
      setSocketConnected(false);
    };

    nextSocket.on('connect', handleConnect);
    nextSocket.on('disconnect', handleDisconnect);
    nextSocket.on('connect_error', handleConnectError);

    return () => {
      nextSocket.off('connect', handleConnect);
      nextSocket.off('disconnect', handleDisconnect);
      nextSocket.off('connect_error', handleConnectError);
      nextSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user]);

  return {
    socket,
    socketRef,
    socketConnected,
    socketError,
  };
};
