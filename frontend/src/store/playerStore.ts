import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

interface PlayerStore {
  userId: string;
  username: string;
  rating: number;
  isRegistered: boolean;
  setUsername: (username: string) => void;
  setRating: (rating: number) => void;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      userId: uuidv4(),
      username: '',
      rating: 1200,
      isRegistered: false,
      setUsername: (username) => {
        set({ username, isRegistered: true });
        localStorage.setItem('chess_username', username);
      },
      setRating: (rating) => set({ rating }),
    }),
    {
      name: 'chess-player',
      onRehydrateStorage: () => (state) => {
        if (state?.userId) localStorage.setItem('chess_user_id', state.userId);
        if (state?.username) localStorage.setItem('chess_username', state.username);
      },
    }
  )
);
