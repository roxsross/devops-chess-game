import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageTransition } from '../components/layout/PageTransition';
import { ChessBoardWrapper } from '../components/game/ChessBoardWrapper';
import { PlayerCard } from '../components/game/PlayerCard';
import { TimerDisplay } from '../components/game/TimerDisplay';
import { MoveHistory } from '../components/game/MoveHistory';
import { GameControls } from '../components/game/GameControls';
import { GameOverModal } from '../components/game/GameOverModal';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { useGameTimer } from '../hooks/useGameTimer';
import { useSocket } from '../hooks/useSocket';
import { SOCKET_EVENTS } from '../types';

function WaitingRoom({ gameId, onCancel }: { gameId: string; onCancel: () => void }) {
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 max-w-sm w-full text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          className="text-5xl mb-6 inline-block"
        >
          ⏳
        </motion.div>
        <h2 className="text-xl font-bold text-[#eaeaea] mb-2">Waiting for opponent</h2>
        <p className="text-sm text-[#8892a4] mb-6">
          Share the link below to invite a friend.
        </p>

        <button
          onClick={copyLink}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#16213e] border border-[rgba(255,255,255,0.08)] text-xs text-[#8892a4] hover:border-[#e2b96f] hover:text-[#eaeaea] transition-all mb-6 cursor-pointer group"
        >
          <span className="truncate flex-1 text-left font-mono">
            {window.location.href}
          </span>
          <span className="text-[#e2b96f] group-hover:opacity-80 shrink-0">📋 Copy</span>
        </button>

        <p className="text-xs text-[#8892a4] mb-6">
          Room <span className="font-mono text-[#eaeaea]">{gameId.slice(0, 8)}…</span>
        </p>

        <Button variant="danger" size="md" onClick={onCancel} className="w-full">
          Cancel Room
        </Button>
      </motion.div>
    </div>
  );
}

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const { game, orientation, drawOfferedBy, setDrawOfferedBy, opponentDisconnected, resetGame } =
    useGameStore();
  const { userId } = usePlayerStore();
  const { whiteTime, blackTime } = useGameTimer();

  useEffect(() => {
    if (!gameId) return;
    socket.emit(SOCKET_EVENTS.CLIENT.JOIN_GAME, { gameId });
    return () => {
      socket.emit(SOCKET_EVENTS.CLIENT.LEAVE_GAME, { gameId });
    };
  }, [gameId]);

  const handleCancelRoom = () => {
    if (!gameId) return;
    socket.emit(SOCKET_EVENTS.CLIENT.CANCEL_ROOM, { gameId });
    resetGame();
    navigate('/lobby');
  };

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">♟</div>
          <p className="text-[#8892a4]">Loading game…</p>
        </div>
      </div>
    );
  }

  if (game.status === 'waiting') {
    const isCreator =
      game.players.white?.userId === userId || game.players.black?.userId === userId;
    return (
      <PageTransition>
        <WaitingRoom
          gameId={game.gameId}
          onCancel={isCreator ? handleCancelRoom : () => navigate('/lobby')}
        />
      </PageTransition>
    );
  }

  const isWhiteOrientation = orientation === 'white';
  const topPlayer = isWhiteOrientation ? game.players.black : game.players.white;
  const bottomPlayer = isWhiteOrientation ? game.players.white : game.players.black;
  const topColor: 'white' | 'black' = isWhiteOrientation ? 'black' : 'white';
  const bottomColor: 'white' | 'black' = isWhiteOrientation ? 'white' : 'black';
  const topSeconds = isWhiteOrientation ? blackTime : whiteTime;
  const bottomSeconds = isWhiteOrientation ? whiteTime : blackTime;
  const isTopTurn =
    (isWhiteOrientation && game.turn === 'b') || (!isWhiteOrientation && game.turn === 'w');

  const handleAcceptDraw = () => {
    socket.emit(SOCKET_EVENTS.CLIENT.ACCEPT_DRAW, { gameId: game.gameId });
    setDrawOfferedBy(null);
  };

  return (
    <PageTransition>
      <div className="min-h-screen pt-16 px-2 pb-2">
        <div
          className="max-w-5xl mx-auto flex gap-3 items-start justify-center"
          style={{ minHeight: 'calc(100vh - 5rem)' }}
        >
          {/* Board column */}
          <div
            className="flex flex-col gap-2 flex-shrink-0"
            style={{ width: 'min(520px, calc(100vh - 180px))' }}
          >
            <div className="flex items-center gap-2">
              <PlayerCard
                username={
                  topPlayer?.username ?? (game.isAiGame ? '🤖 Stockfish' : 'Waiting…')
                }
                rating={topPlayer?.rating ?? (game.isAiGame ? 3500 : 1200)}
                color={topColor}
                isActive={isTopTurn && game.status === 'active'}
                isConnected={!opponentDisconnected}
              />
              <TimerDisplay
                seconds={topSeconds}
                isActive={isTopTurn && game.status === 'active'}
                color={topColor}
              />
            </div>

            <ChessBoardWrapper />

            <div className="flex items-center gap-2">
              <PlayerCard
                username={bottomPlayer?.username ?? 'You'}
                rating={bottomPlayer?.rating ?? 1200}
                color={bottomColor}
                isActive={!isTopTurn && game.status === 'active'}
              />
              <TimerDisplay
                seconds={bottomSeconds}
                isActive={!isTopTurn && game.status === 'active'}
                color={bottomColor}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div
            className="glass rounded-2xl p-4 flex flex-col gap-4 w-52 flex-shrink-0 self-center overflow-hidden"
            style={{ maxHeight: 'min(520px, calc(100vh - 180px))' }}
          >
            <MoveHistory />
            <div className="border-t border-[rgba(255,255,255,0.08)]" />
            <GameControls />
          </div>
        </div>
      </div>

      <GameOverModal />

      <Modal isOpen={!!drawOfferedBy} title="Draw Offered" size="sm">
        <p className="text-sm text-[#8892a4] mb-4">Your opponent offers a draw. Accept?</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="md" onClick={() => setDrawOfferedBy(null)} className="flex-1">
            Decline
          </Button>
          <Button variant="primary" size="md" onClick={handleAcceptDraw} className="flex-1">
            Accept
          </Button>
        </div>
      </Modal>

      {opponentDisconnected && game.status === 'active' && (
        <div className="fixed bottom-4 right-4 glass rounded-xl px-4 py-3 text-sm text-[#e94560] border border-[rgba(233,69,96,0.3)]">
          ⚠ Opponent disconnected
        </div>
      )}
    </PageTransition>
  );
}
