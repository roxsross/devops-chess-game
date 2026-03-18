import { create } from 'zustand';
import type { LobbyRoom } from '../types';

interface LobbyStore {
  rooms: LobbyRoom[];
  isLoading: boolean;
  setRooms: (rooms: LobbyRoom[]) => void;
  setLoading: (v: boolean) => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  rooms: [],
  isLoading: false,
  setRooms: (rooms) => set({ rooms }),
  setLoading: (isLoading) => set({ isLoading }),
}));
