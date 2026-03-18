import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TIME_CONTROLS } from '../../config/constants';
import type { DifficultyLevel } from '../../types';
import { DifficultySelector } from '../game/DifficultySelector';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMultiplayer: (timeControl: number, color: 'w' | 'b') => void;
  onCreateAI: (timeControl: number, difficulty: DifficultyLevel, color: 'w' | 'b') => void;
}

export function CreateRoomModal({
  isOpen,
  onClose,
  onCreateMultiplayer,
  onCreateAI,
}: CreateRoomModalProps) {
  const [mode, setMode] = useState<'multiplayer' | 'ai'>('multiplayer');
  const [timeControl, setTimeControl] = useState(600);
  const [color, setColor] = useState<'w' | 'b'>('w');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');

  const handleCreate = () => {
    if (mode === 'multiplayer') {
      onCreateMultiplayer(timeControl, color);
    } else {
      onCreateAI(timeControl, difficulty, color);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Game" size="md">
      <div className="space-y-5">
        {/* Mode */}
        <div>
          <label className="text-xs text-[#8892a4] uppercase tracking-wider mb-2 block">Mode</label>
          <div className="grid grid-cols-2 gap-2">
            {(['multiplayer', 'ai'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-2 rounded-lg text-sm font-medium transition-all cursor-pointer
                  ${mode === m
                    ? 'bg-[#e2b96f] text-[#1a1a2e]'
                    : 'bg-[#16213e] text-[#8892a4] hover:bg-[#0f3460]'
                  }`}
              >
                {m === 'multiplayer' ? '👥 Multiplayer' : '🤖 vs AI'}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="text-xs text-[#8892a4] uppercase tracking-wider mb-2 block">Play as</label>
          <div className="grid grid-cols-2 gap-2">
            {([['w', '♔ White'], ['b', '♚ Black']] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setColor(v)}
                className={`py-2 rounded-lg text-sm font-medium transition-all cursor-pointer
                  ${color === v
                    ? 'bg-[#e2b96f] text-[#1a1a2e]'
                    : 'bg-[#16213e] text-[#8892a4] hover:bg-[#0f3460]'
                  }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Time control */}
        <div>
          <label className="text-xs text-[#8892a4] uppercase tracking-wider mb-2 block">Time Control</label>
          <div className="flex flex-wrap gap-2">
            {TIME_CONTROLS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setTimeControl(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
                  ${timeControl === value
                    ? 'bg-[#e2b96f] text-[#1a1a2e]'
                    : 'bg-[#16213e] text-[#8892a4] hover:bg-[#0f3460]'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'ai' && (
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" size="md" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleCreate} className="flex-1">
            {mode === 'multiplayer' ? 'Create Room' : 'Play vs AI'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
