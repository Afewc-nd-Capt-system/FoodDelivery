'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  orderUpdates: any[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  orderUpdates: [],
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState<any[]>([]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('order-status-update', (data) => {
      console.log('Order status update:', data);
      setOrderUpdates(prev => [...prev, data]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, orderUpdates }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);

export const useOrderSocket = (orderId: string) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (socket && orderId) {
      socket.emit('join-order', orderId);
    }
  }, [socket, orderId]);
};

export const useUserSocket = (userId: string) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (socket && userId) {
      socket.emit('join-user', userId);
    }
  }, [socket, userId]);
};
