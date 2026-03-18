import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '../ui/Spinner';
import api from '../../lib/api';
import { useUIStore } from '../../store/uiStore';

interface PlayerRecord {
  userId: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
}

function medal(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return <span className="text-[#8892a4] text-xs font-mono">{rank}</span>;
}

function winRate(p: PlayerRecord) {
  return p.gamesPlayed === 0
    ? '—'
    : `${Math.round((p.gamesWon / p.gamesPlayed) * 100)}%`;
}

export function LeaderboardDrawer() {
  const { isLeaderboardOpen, closeLeaderboard } = useUIStore();
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLeaderboardOpen) return;
    setLoading(true);
    setError(null);
    api
      .get<{ players: PlayerRecord[] }>('/players/leaderboard')
      .then((res) => setPlayers(res.data.players))
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [isLeaderboardOpen]);

  return (
    <AnimatePresence>
      {isLeaderboardOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={closeLeaderboard}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col"
            style={{ background: '#0f1a2e', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.08)]">
              <div>
                <h2 className="font-bold text-[#eaeaea] text-lg leading-none">🏆 Leaderboard</h2>
                <p className="text-xs text-[#8892a4] mt-1">Top 20 · Elo ranking</p>
              </div>
              <button
                onClick={closeLeaderboard}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8892a4] hover:text-[#eaeaea] hover:bg-[#16213e] transition-colors cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex justify-center py-16">
                  <Spinner />
                </div>
              )}

              {error && (
                <div className="text-center py-16 text-[#e94560] text-sm">{error}</div>
              )}

              {!loading && !error && players.length === 0 && (
                <div className="text-center py-16 text-[#8892a4] text-sm">
                  No players yet. Play a game to appear here!
                </div>
              )}

              {!loading && !error && players.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ background: '#0f1a2e' }}>
                    <tr className="border-b border-[rgba(255,255,255,0.08)] text-[#8892a4] text-[10px] uppercase tracking-wider">
                      <th className="px-4 py-3 text-center w-8">#</th>
                      <th className="px-3 py-3 text-left">Player</th>
                      <th className="px-3 py-3 text-right">Elo</th>
                      <th className="px-3 py-3 text-right">W/L</th>
                      <th className="px-3 py-3 text-right">Win%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, i) => (
                      <tr
                        key={p.userId}
                        className={`border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors ${
                          i === 0 ? 'bg-[rgba(226,185,111,0.05)]' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-center text-base">{medal(i + 1)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#0f3460] flex items-center justify-center text-[10px] font-bold text-[#e2b96f] shrink-0">
                              {p.username[0]?.toUpperCase()}
                            </div>
                            <span className="text-[#eaeaea] truncate max-w-[90px]">{p.username}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-[#e2b96f]">{p.rating}</td>
                        <td className="px-3 py-3 text-right text-xs">
                          <span className="text-green-400">{p.gamesWon}</span>
                          <span className="text-[#8892a4]">/</span>
                          <span className="text-[#e94560]">{p.gamesLost}</span>
                        </td>
                        <td className="px-3 py-3 text-right text-[#eaeaea] text-xs">{winRate(p)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.08)] text-center">
              <p className="text-[10px] text-[#8892a4]">
                Elo updated after every human vs human match
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
