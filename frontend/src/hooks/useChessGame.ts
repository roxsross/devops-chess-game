import { useMemo } from 'react';
import { Chess } from 'chess.js';
import { useGameStore } from '../store/gameStore';

export function useChessGame() {
  const fen = useGameStore((s) => s.game?.fen);
  const moves = useGameStore((s) => s.game?.moves);

  const chess = useMemo(() => {
    try {
      return new Chess(fen ?? undefined);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const legalMoves = useMemo(() => {
    const map: Record<string, string[]> = {};
    chess.moves({ verbose: true }).forEach((m) => {
      if (!map[m.from]) map[m.from] = [];
      map[m.from].push(m.to);
    });
    return map;
  }, [chess]);

  const lastMove = moves?.at(-1) ?? null;

  return { chess, legalMoves, lastMove, fen: fen ?? chess.fen() };
}
