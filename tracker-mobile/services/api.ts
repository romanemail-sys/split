import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async (config) => {
  const deviceId = await AsyncStorage.getItem('deviceId');
  if (deviceId) config.headers['X-Device-Id'] = deviceId;
  return config;
});

export async function registerDevice(deviceId: string, name?: string) {
  const res = await api.post('/devices', { id: deviceId, name });
  return res.data;
}

export async function fetchConfig(): Promise<Record<string, string>> {
  const res = await api.get('/config');
  return res.data;
}

export async function uploadLocations(records: Array<{
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}>) {
  const res = await api.post('/locations', { records });
  return res.data as { count: number };
}

export async function fetchLocationHistory(
  deviceId: string,
  from?: Date,
  to?: Date,
): Promise<Array<{ latitude: number; longitude: number; timestamp: string }>> {
  const params: Record<string, string> = { deviceId };
  if (from) params.from = from.toISOString();
  if (to) params.to = to.toISOString();
  const res = await api.get('/locations', { params });
  return res.data;
}

export async function createGroup(name: string) {
  const res = await api.post('/groups', { name });
  return res.data as { id: string; name: string; createdById: string; createdAt: string };
}

export async function joinGroup(groupId: string) {
  const res = await api.post(`/groups/${groupId}/join`, {});
  return res.data;
}

export async function fetchGroupMembers(groupId: string): Promise<Array<{
  deviceId: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
}>> {
  const res = await api.get(`/groups/${groupId}/members`);
  return res.data;
}

export async function blockDevice(groupId: string, targetDeviceId: string) {
  await api.post(`/groups/${groupId}/block/${targetDeviceId}`);
}

export async function unblockDevice(groupId: string, targetDeviceId: string) {
  await api.delete(`/groups/${groupId}/block/${targetDeviceId}`);
}
