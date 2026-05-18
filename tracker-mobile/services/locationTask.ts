import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadLocations } from './api';

export const LOCATION_TASK_NAME = 'background-location-task';

interface LocationBuffer {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
    if (error) {
      console.error('Location task error:', error.message);
      return;
    }

    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations?.length) return;

    const records: LocationBuffer[] = locations.map((loc) => ({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? undefined,
      timestamp: new Date(loc.timestamp).toISOString(),
    }));

    try {
      await uploadLocations(records);
    } catch {
      const raw = await AsyncStorage.getItem('locationBuffer');
      const buffered: LocationBuffer[] = raw ? JSON.parse(raw) : [];
      const merged = [...buffered, ...records].slice(-1000);
      await AsyncStorage.setItem('locationBuffer', JSON.stringify(merged));
    }
  },
);

export async function startLocationTracking(intervalSeconds: number) {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Background location permission denied');

  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: intervalSeconds * 1000,
    distanceInterval: 0,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Location Tracker',
      notificationBody: 'Recording your location',
    },
  });
}

export async function stopLocationTracking() {
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export async function flushBuffer() {
  const raw = await AsyncStorage.getItem('locationBuffer');
  if (!raw) return;
  const buffered: LocationBuffer[] = JSON.parse(raw);
  if (!buffered.length) return;
  await uploadLocations(buffered);
  await AsyncStorage.removeItem('locationBuffer');
}
