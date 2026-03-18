import { motion } from 'framer-motion';
import type { LobbyRoom } from '../../types';
import { Button } from '../ui/Button';

interface RoomCardProps {
  room: LobbyRoom;
  onJoin: (gameId: string) => void;
  currentUserId?: string;
}

function formatTime(s: number): string {
  if (s < 60) return `${s}s`;
  const m = s / 60;
  if (m < 3) return `${m} min · Bullet`;
  if (m < 10) return `${m} min · Blitz`;
  if (m < 30) return `${m} min · Rapid`;
  return `${m} min · Classical`;
}

export function RoomCard({ room, onJoin, currentUserId }: RoomCardProps) {
  const creator = room.players.white ?? room.players.black;
  const isOwn = creator?.userId === currentUserId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-4"
    >
      {/* Creator info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-[#0f3460] flex items-center justify-center text-sm font-bold text-[#e2b96f] shrink-0">
          {creator?.username[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-[#eaeaea] truncate">
            {creator?.username ?? 'Unknown'}
            {isOwn && <span className="ml-2 text-[10px] text-[#8892a4] font-normal">(you)</span>}
          </p>
          <p className="text-xs text-[#8892a4]">
            {creator?.rating ?? '?'} Elo
          </p>
        </div>
      </div>

      {/* Time control + join */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-medium text-[#eaeaea]">{formatTime(room.timeControl)}</p>
          <p className="text-[10px] text-[#e2b96f]">
            {room.players.white ? '♔ White taken' : '♚ Black taken'}
          </p>
        </div>
        {isOwn ? (
          <span className="text-xs text-[#8892a4] italic">Your room</span>
        ) : (
          <Button variant="primary" size="sm" onClick={() => onJoin(room.gameId)}>
            Join →
          </Button>
        )}
      </div>
    </motion.div>
  );
}
