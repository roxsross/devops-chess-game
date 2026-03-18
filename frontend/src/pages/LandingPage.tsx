import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { PageTransition } from '../components/layout/PageTransition';
import { useUIStore } from '../store/uiStore';

const features = [
  { icon: '⚡', title: 'Real-time Multiplayer', desc: 'WebSocket-powered — moves sync instantly across players', action: null },
  { icon: '🤖', title: 'Stockfish AI', desc: '4 difficulty levels from Easy to Expert (Elo 3500+)', action: null },
  { icon: '⏱', title: 'Time Controls', desc: 'Bullet, Blitz, Rapid and Classical — 1 to 30 min', action: null },
  { icon: '🏆', title: 'Leaderboard', desc: 'Live Elo rankings updated after every match. Click to view →', action: 'leaderboard' },
] as const;

export function LandingPage() {
  const navigate = useNavigate();
  const { openLeaderboard } = useUIStore();

  const handleFeature = (action: string | null) => {
    if (action === 'leaderboard') openLeaderboard();
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 pb-24">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="text-center max-w-2xl w-full"
        >
          <motion.div
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="text-8xl mb-6 select-none inline-block"
          >
            ♟
          </motion.div>

          <h1 className="text-5xl font-bold text-[#eaeaea] mb-3 tracking-tight">
            Chess <span className="text-[#e2b96f]">Master</span>
          </h1>
          <p className="text-base text-[#8892a4] mb-10 leading-relaxed max-w-md mx-auto">
            Play online against real players or challenge our Stockfish AI engine.
            Track your Elo and climb the leaderboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" size="lg" onClick={() => navigate('/lobby')} className="min-w-44">
              👥 Play Online
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/lobby?mode=ai')} className="min-w-44">
              🤖 Play vs AI
            </Button>
          </div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.55 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-16 max-w-4xl w-full"
        >
          {features.map(({ icon, title, desc, action }) => (
            <div
              key={title}
              onClick={() => handleFeature(action)}
              className={`glass rounded-xl p-5 text-center transition-colors ${
                action
                  ? 'cursor-pointer hover:border-[#e2b96f] hover:bg-[rgba(226,185,111,0.05)]'
                  : 'hover:border-[rgba(226,185,111,0.2)]'
              }`}
            >
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-semibold text-[#eaeaea] mb-1 text-sm">{title}</h3>
              <p className="text-xs text-[#8892a4] leading-relaxed">{desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </PageTransition>
  );
}
