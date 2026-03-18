import { create } from 'zustand';
import type { GameState, GameMove, GameResult } from '../types';

interface MovePayload {
  move: GameMove;
  fen: string;
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  result: GameResult;
  resultReason?: string;
}

interface GameStore {
  game: GameState | null;
  isLoading: boolean;
  orientation: 'white' | 'black';
  drawOfferedBy: string | null;
  opponentDisconnected: boolean;
  setGame: (game: GameState) => void;
  applyMove: (payload: MovePayload) => void;
  setGameOver: (result: GameResult, reason?: string) => void;
  setOrientation: (o: 'white' | 'black') => void;
  setDrawOfferedBy: (userId: string | null) => void;
  setOpponentDisconnected: (v: boolean) => void;
  resetGame: () => void;
  setLoading: (v: boolean) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  game: null,
  isLoading: false,
  orientation: 'white',
  drawOfferedBy: null,
  opponentDisconnected: false,

  setGame: (game) => set({ game }),

  applyMove: (payload) =>
    set((state) => {
      if (!state.game) return state;
      const isOver = payload.isCheckmate || payload.isDraw || payload.isStalemate;
      return {
        game: {
          ...state.game,
          fen: payload.fen,
          turn: payload.turn,
          moves: [...state.game.moves, payload.move],
          isCheck: payload.isCheck,
          isCheckmate: payload.isCheckmate,
          isStalemate: payload.isStalemate,
          isDraw: payload.isDraw,
          result: payload.result,
          resultReason: payload.resultReason,
          status: isOver ? 'completed' : state.game.status,
        },
      };
    }),

  setGameOver: (result, reason) =>
    set((state) => ({
      game: state.game
        ? { ...state.game, status: 'completed', result, resultReason: reason }
        : null,
    })),

  setOrientation: (orientation) => set({ orientation }),
  setDrawOfferedBy: (drawOfferedBy) => set({ drawOfferedBy }),
  setOpponentDisconnected: (opponentDisconnected) => set({ opponentDisconnected }),
  resetGame: () => set({ game: null, drawOfferedBy: null, opponentDisconnected: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
