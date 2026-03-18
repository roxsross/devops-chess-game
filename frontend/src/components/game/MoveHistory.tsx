import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

export function MoveHistory() {
  const moves = useGameStore((s) => s.game?.moves ?? []);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves.length]);

  const pairs: Array<[string, string?]> = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i].san, moves[i + 1]?.san]);
  }

  return (
    <div className="flex flex-col min-h-0">
      <h3 className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider mb-2">
        Moves
      </h3>
      <div ref={scrollRef} className="overflow-y-auto space-y-0.5 max-h-44">
        {pairs.length === 0 ? (
          <p className="text-xs text-[#8892a4] py-1">No moves yet</p>
        ) : (
          pairs.map((pair, idx) => (
            <div key={idx} className="flex items-stretch text-xs rounded overflow-hidden">
              <span className="w-7 text-center text-[#8892a4] py-1 bg-[#16213e] flex-shrink-0 flex items-center justify-center">
                {idx + 1}
              </span>
              <span
                className={`flex-1 px-2 py-1 font-mono hover:bg-[#0f3460] cursor-default transition-colors ${
                  idx === pairs.length - 1 && !pair[1]
                    ? 'text-[#e2b96f] font-semibold'
                    : 'text-[#eaeaea]'
                }`}
              >
                {pair[0]}
              </span>
              <span
                className={`flex-1 px-2 py-1 font-mono hover:bg-[#0f3460] cursor-default transition-colors ${
                  idx === pairs.length - 1 && pair[1]
                    ? 'text-[#e2b96f] font-semibold'
                    : 'text-[#8892a4]'
                }`}
              >
                {pair[1] ?? ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
