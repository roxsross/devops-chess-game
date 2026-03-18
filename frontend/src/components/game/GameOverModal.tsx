import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import type { GameResult } from '../../types';

function getResultDisplay(
  result: GameResult,
  myColor: 'w' | 'b' | undefined
): { title: string; sub: string; emoji: string } {
  if (result === 'draw') return { title: "It's a Draw!", sub: 'Well played by both sides', emoji: '🤝' };
  if (!myColor) {
    return result === 'white'
      ? { title: 'White Wins!', sub: '', emoji: '♔' }
      : { title: 'Black Wins!', sub: '', emoji: '♚' };
  }
  const iWon =
    (result === 'white' && myColor === 'w') || (result === 'black' && myColor === 'b');
  return iWon
    ? { title: 'You Win!', sub: 'Excellent play!', emoji: '🏆' }
    : { title: 'You Lose', sub: 'Better luck next time', emoji: '💀' };
}

export function GameOverModal() {
  const { game, resetGame } = useGameStore();
  const { userId } = usePlayerStore();
  const navigate = useNavigate();

  if (!game || game.status !== 'completed') return null;

  const myPlayer =
    game.players.white?.userId === userId ? game.players.white : game.players.black;
  const { title, sub, emoji } = getResultDisplay(game.result, myPlayer?.color);

  const handleNewGame = () => {
    resetGame();
    navigate('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.8)' }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 0.1 }}
        className="glass rounded-3xl p-10 text-center max-w-sm w-full mx-4 shadow-2xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
          className="text-7xl mb-6"
        >
          {emoji}
        </motion.div>
        <h2 className="text-3xl font-bold text-[#eaeaea] mb-2">{title}</h2>
        {sub && <p className="text-[#8892a4] mb-1">{sub}</p>}
        {game.resultReason && (
          <p className="text-sm text-[#e2b96f] mb-6 capitalize">{game.resultReason}</p>
        )}
        <p className="text-sm text-[#8892a4] mb-8">{game.moves.length} moves played</p>
        <Button variant="primary" size="lg" onClick={handleNewGame} className="w-full">
          Play Again
        </Button>
      </motion.div>
    </motion.div>
  );
}
