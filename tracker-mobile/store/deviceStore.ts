import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

interface DeviceState {
  deviceId: string | null;
  trackingIntervalSeconds: number;
  ready: boolean;
  initDevice: () => Promise<void>;
  setTrackingInterval: (seconds: number) => void;
  setReady: (ready: boolean) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  deviceId: null,
  trackingIntervalSeconds: 30,
  ready: false,

  initDevice: async () => {
    let id = await AsyncStorage.getItem('deviceId');
    if (!id) {
      id = Crypto.randomUUID();
      await AsyncStorage.setItem('deviceId', id);
    }
    set({ deviceId: id });
  },

  setTrackingInterval: (seconds) => set({ trackingIntervalSeconds: seconds }),
  setReady: (ready) => set({ ready }),
}));
