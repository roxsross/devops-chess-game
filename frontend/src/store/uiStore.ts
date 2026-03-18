import { create } from 'zustand';

interface UIStore {
  isLeaderboardOpen: boolean;
  openLeaderboard: () => void;
  closeLeaderboard: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isLeaderboardOpen: false,
  openLeaderboard: () => set({ isLeaderboardOpen: true }),
  closeLeaderboard: () => set({ isLeaderboardOpen: false }),
}));
