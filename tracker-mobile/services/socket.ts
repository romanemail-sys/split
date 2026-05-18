import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const deviceId = await AsyncStorage.getItem('deviceId');
  socket = io(API_BASE, { auth: { deviceId }, transports: ['websocket'] });
  return socket;
}

export async function joinGroupRoom(groupId: string) {
  const s = await getSocket();
  s.emit('join:group', groupId);
}

export async function emitLocation(groupId: string, latitude: number, longitude: number) {
  const s = await getSocket();
  s.emit('location:update', {
    groupId,
    latitude,
    longitude,
    timestamp: new Date().toISOString(),
  });
}
