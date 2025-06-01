import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only connect to socket if user is authenticated
    if (isAuthenticated && user) {
      // Create a socket connection
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin
        : 'http://localhost:5000';
        
      console.log('Connecting to socket at:', socketUrl);
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true
      });

      // Set up event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);

        // Join room based on user role
        if (user.role === 'manager') {
          console.log('Joining managers room');
          newSocket.emit('join', { role: 'manager', userId: user._id });
        } else if (user.role === 'delivery_partner') {
          console.log('Joining delivery partner room:', user._id);
          newSocket.emit('join', { role: 'delivery_partner', userId: user._id });
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
      });

      // Save socket instance
      setSocket(newSocket);

      // Clean up on unmount
      return () => {
        console.log('Disconnecting socket');
        newSocket.disconnect();
      };
    }

    // If user logs out, disconnect socket
    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
    };
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
