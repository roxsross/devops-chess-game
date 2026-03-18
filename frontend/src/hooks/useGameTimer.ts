import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export function useGameTimer() {
  const game = useGameStore((s) => s.game);
  const [whiteTime, setWhiteTime] = useState(game?.timeRemaining?.white ?? 600);
  const [blackTime, setBlackTime] = useState(game?.timeRemaining?.black ?? 600);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (game?.timeRemaining) {
      setWhiteTime(game.timeRemaining.white);
      setBlackTime(game.timeRemaining.black);
    }
  }, [game?.gameId]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!game || game.status !== 'active') return;

    intervalRef.current = setInterval(() => {
      if (game.turn === 'w') {
        setWhiteTime((t) => Math.max(0, t - 1));
      } else {
        setBlackTime((t) => Math.max(0, t - 1));
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [game?.status, game?.turn]);

  return { whiteTime, blackTime };
}
