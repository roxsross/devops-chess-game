import { useCallback, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { useChessGame } from '../../hooks/useChessGame';
import { getSocket } from '../../lib/socket';
import { SOCKET_EVENTS } from '../../types';

export function ChessBoardWrapper() {
  const { game, orientation } = useGameStore();
  const { userId } = usePlayerStore();
  const { chess, legalMoves, lastMove } = useChessGame();
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);

  const myPlayer = game?.players.white?.userId === userId ? game?.players.white : game?.players.black;
  const myColor = myPlayer?.color ?? 'w';
  const isMyTurn = game?.turn === myColor && game?.status === 'active';

  // Square highlight styles
  const squareStyles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: 'rgba(226,185,111,0.25)' };
    squareStyles[lastMove.to] = { backgroundColor: 'rgba(226,185,111,0.4)' };
  }

  if (game?.isCheck) {
    for (const row of chess.board()) {
      for (const sq of row) {
        if (sq?.type === 'k' && sq.color === game.turn) {
          squareStyles[sq.square] = {
            backgroundColor: 'rgba(233,69,96,0.5)',
            boxShadow: '0 0 0 3px rgba(233,69,96,0.8) inset',
          };
        }
      }
    }
  }

  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      ...(squareStyles[selectedSquare] ?? {}),
      backgroundColor: 'rgba(226,185,111,0.35)',
    };
    (legalMoves[selectedSquare] ?? []).forEach((sq) => {
      squareStyles[sq] = {
        background: chess.get(sq as Square)
          ? 'radial-gradient(circle, rgba(233,69,96,0.5) 60%, transparent 60%)'
          : 'radial-gradient(circle, rgba(226,185,111,0.55) 28%, transparent 28%)',
      };
    });
  }

  function submitMove(from: Square, to: Square, promotion?: string) {
    if (!game) return;
    getSocket().emit(SOCKET_EVENTS.CLIENT.MAKE_MOVE, { gameId: game.gameId, from, to, promotion });
  }

  function isPromotion(from: Square, to: Square): boolean {
    const piece = chess.get(from);
    return (
      piece?.type === 'p' &&
      ((myColor === 'w' && to[1] === '8') || (myColor === 'b' && to[1] === '1'))
    );
  }

  // react-chessboard v5: onSquareClick receives { piece: PieceDataType | null, square: string }
  const onSquareClick = useCallback(
    ({ square }: { piece: unknown; square: string }) => {
      const sq = square as Square;
      if (!isMyTurn) return;

      if (selectedSquare) {
        const targets = legalMoves[selectedSquare] ?? [];
        if (targets.includes(sq)) {
          if (isPromotion(selectedSquare, sq)) {
            setPromotionPending({ from: selectedSquare, to: sq });
          } else {
            submitMove(selectedSquare, sq);
          }
          setSelectedSquare(null);
          return;
        }
        setSelectedSquare(null);
      }

      if (chess.get(sq)?.color === myColor) {
        setSelectedSquare(sq);
      }
    },
    [selectedSquare, legalMoves, isMyTurn, myColor, chess]
  );

  // react-chessboard v5: onPieceDrop receives { piece: DraggingPieceDataType, sourceSquare, targetSquare: string | null }
  const onPieceDrop = useCallback(
    ({ piece, sourceSquare, targetSquare }: { piece: { pieceType: string }; sourceSquare: string; targetSquare: string | null }): boolean => {
      if (!isMyTurn || !targetSquare) return false;
      const pieceColor = piece.pieceType[0].toLowerCase() === 'w' ? 'w' : 'b';
      if (pieceColor !== myColor) return false;
      const src = sourceSquare as Square;
      const tgt = targetSquare as Square;
      const valid = (legalMoves[src] ?? []).includes(tgt);
      if (!valid) return false;
      if (isPromotion(src, tgt)) {
        setPromotionPending({ from: src, to: tgt });
        return false;
      }
      submitMove(src, tgt);
      return true;
    },
    [isMyTurn, myColor, legalMoves, chess]
  );

  return (
    <div className="relative w-full">
      <Chessboard
        options={{
          position: game?.fen ?? 'start',
          boardOrientation: orientation,
          squareStyles,
          boardStyle: {
            borderRadius: '8px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          },
          darkSquareStyle: { backgroundColor: '#b58863' },
          lightSquareStyle: { backgroundColor: '#f0d9b5' },
          allowDragging: isMyTurn,
          onSquareClick,
          onPieceDrop,
        }}
      />

      {promotionPending && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg z-10"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div className="glass p-4 rounded-xl">
            <p className="text-center text-sm mb-3 text-[#eaeaea]">Promote pawn to:</p>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    submitMove(promotionPending.from, promotionPending.to, p);
                    setPromotionPending(null);
                  }}
                  className="w-12 h-12 rounded-lg bg-[#0f3460] hover:bg-[#e2b96f] hover:text-[#1a1a2e] text-2xl transition-all cursor-pointer text-[#eaeaea]"
                >
                  {{ q: '♛', r: '♜', b: '♝', n: '♞' }[p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
