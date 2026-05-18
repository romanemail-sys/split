import { create } from 'zustand';

export interface Group {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
}

interface GroupState {
  groups: Group[];
  liveLocations: Record<string, { latitude: number; longitude: number; timestamp: string }>;
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  updateLiveLocation: (deviceId: string, lat: number, lng: number, ts: string) => void;
}

export const useGroupStore = create<GroupState>((set) => ({
  groups: [],
  liveLocations: {},
  setGroups: (groups) => set({ groups }),
  addGroup: (group) => set((s) => ({ groups: [...s.groups, group] })),
  updateLiveLocation: (deviceId, latitude, longitude, timestamp) =>
    set((s) => ({
      liveLocations: { ...s.liveLocations, [deviceId]: { latitude, longitude, timestamp } },
    })),
}));
