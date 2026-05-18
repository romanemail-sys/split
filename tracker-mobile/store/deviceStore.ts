import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

interface DeviceState {
  deviceId: string | null;
  trackingIntervalSeconds: number;
  initDevice: () => Promise<void>;
  setTrackingInterval: (seconds: number) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  deviceId: null,
  trackingIntervalSeconds: 30,

  initDevice: async () => {
    let id = await AsyncStorage.getItem('deviceId');
    if (!id) {
      id = uuidv4();
      await AsyncStorage.setItem('deviceId', id);
    }
    set({ deviceId: id });
  },

  setTrackingInterval: (seconds) => set({ trackingIntervalSeconds: seconds }),
}));
