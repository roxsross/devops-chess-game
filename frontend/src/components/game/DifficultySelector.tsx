import { DIFFICULTY_LABELS } from '../../config/constants';
import type { DifficultyLevel } from '../../types';

interface DifficultySelectorProps {
  value: DifficultyLevel;
  onChange: (v: DifficultyLevel) => void;
  disabled?: boolean;
}

const levels: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert'];

export function DifficultySelector({ value, onChange, disabled }: DifficultySelectorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider">Difficulty</h3>
      <div className="grid grid-cols-2 gap-1">
        {levels.map((level) => (
          <button
            key={level}
            disabled={disabled}
            onClick={() => onChange(level)}
            className={`
              px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
              ${value === level
                ? 'bg-[#e2b96f] text-[#1a1a2e]'
                : 'bg-[#16213e] text-[#8892a4] hover:bg-[#0f3460]'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {DIFFICULTY_LABELS[level]}
          </button>
        ))}
      </div>
    </div>
  );
}
