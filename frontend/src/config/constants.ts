export const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';
export const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3001';

export const TIME_CONTROLS = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '30 min', value: 1800 },
] as const;

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};
