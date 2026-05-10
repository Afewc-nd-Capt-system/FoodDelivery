import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://10.0.2.2:5000';

let orderSocket: Socket | null = null;
let trackingSocket: Socket | null = null;

export async function createOrderSocket() {
  if (orderSocket?.connected) {
    return orderSocket;
  }

  const token = await SecureStore.getItemAsync('jwt_token');
  
  orderSocket = io(`${SOCKET_URL}/orders`, {
    auth: { token },
    transports: ['websocket'],
  });

  orderSocket.on('connect', () => {
    console.log('Order socket connected');
  });

  orderSocket.on('disconnect', () => {
    console.log('Order socket disconnected');
  });

  orderSocket.on('error', (error) => {
    console.error('Order socket error:', error);
  });

  return orderSocket;
}

export async function createTrackingSocket() {
  if (trackingSocket?.connected) {
    return trackingSocket;
  }

  const token = await SecureStore.getItemAsync('jwt_token');
  
  trackingSocket = io(`${SOCKET_URL}/tracking`, {
    auth: { token },
    transports: ['websocket'],
  });

  trackingSocket.on('connect', () => {
    console.log('Tracking socket connected');
  });

  trackingSocket.on('disconnect', () => {
    console.log('Tracking socket disconnected');
  });

  trackingSocket.on('error', (error) => {
    console.error('Tracking socket error:', error);
  });

  return trackingSocket;
}

export function disconnectOrderSocket() {
  if (orderSocket) {
    orderSocket.disconnect();
    orderSocket = null;
  }
}

export function disconnectTrackingSocket() {
  if (trackingSocket) {
    trackingSocket.disconnect();
    trackingSocket = null;
  }
}

export function getOrderSocket() {
  return orderSocket;
}

export function getTrackingSocket() {
  return trackingSocket;
}
