import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(event, callback) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!socketRef.current) {
      socketRef.current = io({ auth: { token } });
    }

    const socket = socketRef.current;
    if (event && callback) {
      socket.on(event, callback);
    }

    return () => {
      if (event && callback) {
        socket.off(event, callback);
      }
    };
  }, [event, callback]);

  return socketRef.current;
}
