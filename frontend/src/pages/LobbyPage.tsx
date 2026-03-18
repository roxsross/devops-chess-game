import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '../components/layout/PageTransition';
import { RoomCard } from '../components/lobby/RoomCard';
import { CreateRoomModal } from '../components/lobby/CreateRoomModal';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useSocket } from '../hooks/useSocket';
import { useLobbyStore } from '../store/lobbyStore';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { SOCKET_EVENTS } from '../types';
import type { DifficultyLevel, GameState } from '../types';

export function LobbyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const socket = useSocket();
  const { rooms, isLoading, setLoading } = useLobbyStore();
  const { setGame, setOrientation } = useGameStore();
  const { userId } = usePlayerStore();
  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get('mode') === 'ai');

  const refreshLobby = () => {
    setLoading(true);
    socket.emit(SOCKET_EVENTS.CLIENT.GET_LOBBY);
    setLoading(false);
  };

  useEffect(() => {
    refreshLobby();
  }, []);

  useEffect(() => {
    const onRoomCreated = ({ gameId, game }: { gameId: string; game: GameState }) => {
      if (game) {
        setGame(game);
        const myColor = game.players.white?.userId === userId ? 'white' : 'black';
        setOrientation(myColor);
      }
      navigate(`/game/${gameId}`);
    };

    const onGameUpdated = (game: GameState) => {
      if (game.status === 'active') {
        setGame(game);
        const myColor = game.players.white?.userId === userId ? 'white' : 'black';
        setOrientation(myColor);
        navigate(`/game/${game.gameId}`);
      }
    };

    socket.on(SOCKET_EVENTS.SERVER.ROOM_CREATED, onRoomCreated);
    socket.on(SOCKET_EVENTS.SERVER.GAME_UPDATED, onGameUpdated);

    return () => {
      socket.off(SOCKET_EVENTS.SERVER.ROOM_CREATED, onRoomCreated);
      socket.off(SOCKET_EVENTS.SERVER.GAME_UPDATED, onGameUpdated);
    };
  }, [userId]);

  const handleJoinRoom = (gameId: string) => {
    socket.emit(SOCKET_EVENTS.CLIENT.JOIN_ROOM, { gameId });
  };

  const handleCreateMultiplayer = (timeControl: number, color: 'w' | 'b') => {
    socket.emit(SOCKET_EVENTS.CLIENT.CREATE_ROOM, { timeControl, color, isAiGame: false });
  };

  const handleCreateAI = (timeControl: number, difficulty: DifficultyLevel, color: 'w' | 'b') => {
    socket.emit(SOCKET_EVENTS.CLIENT.CREATE_ROOM, { timeControl, color, difficulty, isAiGame: true });
  };

  return (
    <PageTransition>
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#eaeaea]">Game Lobby</h1>
              <p className="text-sm text-[#8892a4] mt-0.5">
                {rooms.length > 0
                  ? `${rooms.length} room${rooms.length !== 1 ? 's' : ''} waiting for players`
                  : 'No open rooms right now'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshLobby}
                title="Refresh"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-[#8892a4] hover:text-[#eaeaea] hover:bg-[#0f3460] transition-colors cursor-pointer"
              >
                ↺
              </button>
              <Button variant="primary" size="md" onClick={() => setIsCreateOpen(true)}>
                + New Game
              </Button>
            </div>
          </div>

          {/* Rooms list */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="glass rounded-2xl p-14 text-center">
              <div className="text-5xl mb-4">🏁</div>
              <h3 className="text-lg font-semibold text-[#eaeaea] mb-2">No open games</h3>
              <p className="text-sm text-[#8892a4] mb-6">
                Be the first to create a room, or play against the AI!
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
                  👥 Create Room
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(true);
                  }}
                >
                  🤖 Play vs AI
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {rooms.map((room) => (
                  <RoomCard key={room.gameId} room={room} onJoin={handleJoinRoom} currentUserId={userId} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateMultiplayer={handleCreateMultiplayer}
        onCreateAI={handleCreateAI}
      />
    </PageTransition>
  );
}
