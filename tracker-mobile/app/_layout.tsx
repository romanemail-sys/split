import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useDeviceStore } from '../store/deviceStore';
import { registerDevice, fetchConfig } from '../services/api';
import { startLocationTracking, flushBuffer } from '../services/locationTask';

export default function RootLayout() {
  const { initDevice, setTrackingInterval, setReady } = useDeviceStore();

  useEffect(() => {
    (async () => {
      await initDevice();
      const { deviceId } = useDeviceStore.getState();
      if (!deviceId) return;

      // Register the device before any authenticated screen makes a request.
      await registerDevice(deviceId).catch(() => null);
      setReady(true);

      const config = await fetchConfig().catch(() => ({ trackingIntervalSeconds: '30' }));
      const interval = parseInt(config.trackingIntervalSeconds ?? '30', 10);
      setTrackingInterval(interval);

      await flushBuffer().catch(() => null);
      await startLocationTracking(interval).catch(console.warn);
    })();
  }, []);

  return <Stack />;
}
