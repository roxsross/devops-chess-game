import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env', () => ({
  config: {
    dynamodb: { gamesTable: 'chess-games' },
  },
}));

const { mockQueryItems, mockPutItem, mockUpdateItem } = vi.hoisted(() => ({
  mockQueryItems: vi.fn(),
  mockPutItem: vi.fn(),
  mockUpdateItem: vi.fn(),
}));

vi.mock('../../services/dynamodb', () => ({
  queryItems: mockQueryItems,
  putItem: mockPutItem,
  updateItem: mockUpdateItem,
  scanItems: vi.fn(),
}));

import { getGame, cancelGame } from '../../services/gameService';
import type { GameState } from '../../types';

const makeGameRecord = (overrides: Partial<GameState & { pk: string; sk: string }> = {}) => ({
  pk: 'game1',
  sk: '2024-01-01T00:00:00.000Z',
  gameId: 'game1',
  status: 'waiting' as GameState['status'],
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  turn: 'w' as const,
  moves: [],
  players: {
    white: { userId: 'creator', username: 'Alice', color: 'w' as const, rating: 1200 },
    black: null,
  },
  result: null,
  isCheck: false,
  isCheckmate: false,
  isStalemate: false,
  isDraw: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isAiGame: false,
  timeControl: 600,
  timeRemaining: { white: 600, black: 600 },
  ...overrides,
});

describe('gameService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getGame', () => {
    it('returns null when game not found', async () => {
      mockQueryItems.mockResolvedValueOnce([]);

      const result = await getGame('nonexistent');

      expect(result).toBeNull();
    });

    it('returns game state without pk/sk fields', async () => {
      mockQueryItems.mockResolvedValueOnce([makeGameRecord()]);

      const result = await getGame('game1');

      expect(result?.gameId).toBe('game1');
      expect(result?.status).toBe('waiting');
      expect(result).not.toHaveProperty('pk');
      expect(result).not.toHaveProperty('sk');
    });

    it('uses Query (not Scan) with pk key condition', async () => {
      mockQueryItems.mockResolvedValueOnce([makeGameRecord()]);

      await getGame('game1');

      const params = mockQueryItems.mock.calls[0][0];
      expect(params).toHaveProperty('KeyConditionExpression', 'pk = :pk');
      expect(params.ExpressionAttributeValues[':pk']).toBe('game1');
    });
  });

  describe('cancelGame', () => {
    it('returns false when game not found', async () => {
      mockQueryItems.mockResolvedValue([]);

      const result = await cancelGame('game1', 'creator');

      expect(result).toBe(false);
      expect(mockUpdateItem).not.toHaveBeenCalled();
    });

    it('returns false when game is not waiting', async () => {
      mockQueryItems.mockResolvedValue([makeGameRecord({ status: 'active' })]);

      const result = await cancelGame('game1', 'creator');

      expect(result).toBe(false);
      expect(mockUpdateItem).not.toHaveBeenCalled();
    });

    it('returns false when user is not the creator', async () => {
      mockQueryItems.mockResolvedValue([makeGameRecord()]);

      const result = await cancelGame('game1', 'other-user');

      expect(result).toBe(false);
      expect(mockUpdateItem).not.toHaveBeenCalled();
    });

    it('returns true and calls updateItem for valid creator cancellation', async () => {
      mockQueryItems.mockResolvedValue([makeGameRecord()]);
      mockUpdateItem.mockResolvedValueOnce(undefined);

      const result = await cancelGame('game1', 'creator');

      expect(result).toBe(true);
      expect(mockUpdateItem).toHaveBeenCalledOnce();
    });
  });
});
