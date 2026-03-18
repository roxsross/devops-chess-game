import { motion } from 'framer-motion';

interface TimerDisplayProps {
  seconds: number;
  isActive: boolean;
  color: 'white' | 'black';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TimerDisplay({ seconds, isActive }: TimerDisplayProps) {
  const isLow = seconds < 30;
  const isCritical = seconds < 10;

  return (
    <motion.div
      animate={isCritical && isActive ? { scale: [1, 1.03, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1 }}
      className={`
        px-4 py-2 rounded-xl font-mono text-xl font-bold tabular-nums transition-colors duration-500 flex-shrink-0
        ${isActive
          ? isCritical
            ? 'bg-[rgba(233,69,96,0.15)] text-[#e94560] border border-[rgba(233,69,96,0.4)]'
            : isLow
            ? 'bg-[rgba(226,185,111,0.15)] text-[#e2b96f] border border-[rgba(226,185,111,0.3)]'
            : 'bg-[#0f3460] text-[#eaeaea]'
          : 'bg-[#16213e] text-[#8892a4]'
        }
      `}
    >
      {formatTime(seconds)}
    </motion.div>
  );
}
