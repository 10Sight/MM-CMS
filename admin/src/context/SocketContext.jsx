import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(import.meta?.env?.VITE_SERVER_URL || 'http://localhost:5000', {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      timeout: 20000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      toast.success('Connected to server');

      // Join general room for notifications
      newSocket.emit('join-room', 'general');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      toast.error('Disconnected from server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('⚠️ Connection error:', error.message);
      setIsConnected(false);
      toast.error('Failed to connect to server');
    });

    // Audit event handlers
    newSocket.on('audit-created', (data) => {

      const auditorName = data?.auditor?.fullName || data?.auditor?.name || data?.auditor || 'Unknown auditor';
      const lineName = data?.line?.name || data?.line || 'Unknown line';
      const machineName = data?.machine?.name || data?.machine || 'Unknown machine';

      toast.success(`New audit submitted by ${auditorName}`, {
        description: `Line: ${lineName}, Machine: ${machineName}`,
        action: {
          label: 'View',
          onClick: () => (window.location.href = '/admin/audits'),
        },
      });
      setNotifications(prev => [{ ...data, type: 'audit-created' }, ...prev.slice(0, 49)]);
    });

    newSocket.on('audit-updated', (data) => {
      toast.info(`Audit updated by ${data.updatedBy}`, {
        description: `Audit ID: ${data.auditId}`,
      });
      setNotifications(prev => [{ ...data, type: 'audit-updated' }, ...prev.slice(0, 49)]);
    });

    newSocket.on('audit-deleted', (data) => {
      toast.warning('An audit has been deleted', {
        description: `Audit ID: ${data.auditId}`,
      });
      setNotifications(prev => [{ ...data, type: 'audit-deleted' }, ...prev.slice(0, 49)]);
    });

    // General notification handler
    newSocket.on('audit-notification', (data) => {
      toast.info(data.message, {
        description: data.timestamp ? new Date(data.timestamp).toLocaleString() : '',
      });
      setNotifications(prev => [data, ...prev.slice(0, 49)]);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
      setSocket(null);
      setIsConnected(false);
    };
  }, []);

  // Socket utility functions
  const joinRoom = (room) => {
    if (socket && isConnected) {
      socket.emit('join-room', room);
    }
  };

  const leaveRoom = (room) => {
    if (socket && isConnected) {
      socket.emit('leave-room', room);
    }
  };

  const sendAuditUpdate = (data) => {
    if (socket && isConnected) {
      socket.emit('audit-update', data);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = {
    socket,
    isConnected,
    notifications,
    joinRoom,
    leaveRoom,
    sendAuditUpdate,
    clearNotifications,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
