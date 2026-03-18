import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { getSocket } from '../../lib/socket';
import { SOCKET_EVENTS } from '../../types';
import { useGameStore } from '../../store/gameStore';

export function GameControls() {
  const { game, resetGame, setOrientation, orientation } = useGameStore();
  const navigate = useNavigate();

  if (!game) return null;

  const socket = getSocket();
  const isActive = game.status === 'active';

  const handleResign = () => {
    if (!window.confirm('Resign this game?')) return;
    socket.emit(SOCKET_EVENTS.CLIENT.RESIGN, { gameId: game.gameId });
  };

  const handleOfferDraw = () => {
    socket.emit(SOCKET_EVENTS.CLIENT.OFFER_DRAW, { gameId: game.gameId });
  };

  const handleFlip = () => {
    setOrientation(orientation === 'white' ? 'black' : 'white');
  };

  const handleNewGame = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider">Controls</h3>
      <Button variant="outline" size="sm" onClick={handleFlip}>
        ⇅ Flip Board
      </Button>
      {isActive && (
        <>
          <Button variant="outline" size="sm" onClick={handleOfferDraw}>
            ½ Offer Draw
          </Button>
          <Button variant="danger" size="sm" onClick={handleResign}>
            ⚑ Resign
          </Button>
        </>
      )}
      {game.status === 'completed' && (
        <Button variant="primary" size="sm" onClick={handleNewGame} className="w-full">
          + New Game
        </Button>
      )}
    </div>
  );
}
