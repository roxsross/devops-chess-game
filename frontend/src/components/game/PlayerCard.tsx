import { Badge } from '../ui/Badge';

interface PlayerCardProps {
  username: string;
  rating: number;
  color: 'white' | 'black';
  isActive: boolean;
  isConnected?: boolean;
}

export function PlayerCard({
  username,
  rating,
  color,
  isActive,
  isConnected = true,
}: PlayerCardProps) {
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 flex-1
        ${isActive
          ? 'bg-[rgba(226,185,111,0.15)] border border-[rgba(226,185,111,0.3)]'
          : 'bg-[#16213e] border border-transparent'
        }
      `}
    >
      <div
        className={`
          w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0
          ${color === 'white' ? 'bg-[#f0d9b5] text-[#1a1a2e]' : 'bg-[#b58863] text-white'}
        `}
      >
        {username[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-[#eaeaea] truncate">{username}</span>
          {!isConnected && <Badge variant="danger">Disconnected</Badge>}
        </div>
        <div className="text-xs text-[#8892a4]">{rating} ELO</div>
      </div>
      {isActive && (
        <div className="w-2 h-2 rounded-full bg-[#e2b96f] animate-pulse flex-shrink-0" />
      )}
    </div>
  );
}
