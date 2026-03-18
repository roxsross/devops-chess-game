import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env', () => ({
  config: {
    dynamodb: { playersTable: 'chess-players' },
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

import { upsertPlayer, getPlayer, updatePlayerStats } from '../../services/playerService';

const makePlayerRecord = (rating = 1200) => ({
  pk: 'u1',
  sk: 'Alice',
  userId: 'u1',
  username: 'Alice',
  rating,
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  gamesDraw: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

describe('playerService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('upsertPlayer', () => {
    it('returns existing player without calling putItem', async () => {
      mockQueryItems.mockResolvedValueOnce([makePlayerRecord()]);

      const result = await upsertPlayer('u1', 'Alice');

      expect(result.userId).toBe('u1');
      expect(result.rating).toBe(1200);
      expect(mockPutItem).not.toHaveBeenCalled();
    });

    it('creates new player with default 1200 rating and zero stats', async () => {
      mockQueryItems.mockResolvedValueOnce([]);
      mockPutItem.mockResolvedValueOnce(undefined);

      const result = await upsertPlayer('u2', 'Bob');

      expect(result.userId).toBe('u2');
      expect(result.username).toBe('Bob');
      expect(result.rating).toBe(1200);
      expect(result.gamesPlayed).toBe(0);
      expect(mockPutItem).toHaveBeenCalledOnce();
    });

    it('strips pk/sk from returned record', async () => {
      mockQueryItems.mockResolvedValueOnce([makePlayerRecord()]);

      const result = await upsertPlayer('u1', 'Alice');

      expect(result).not.toHaveProperty('pk');
      expect(result).not.toHaveProperty('sk');
    });
  });

  describe('getPlayer', () => {
    it('returns null when player not found', async () => {
      mockQueryItems.mockResolvedValueOnce([]);

      const result = await getPlayer('nonexistent');

      expect(result).toBeNull();
    });

    it('returns player record without pk/sk', async () => {
      mockQueryItems.mockResolvedValueOnce([makePlayerRecord(1500)]);

      const result = await getPlayer('u1');

      expect(result?.rating).toBe(1500);
      expect(result).not.toHaveProperty('pk');
      expect(result).not.toHaveProperty('sk');
    });
  });

  describe('updatePlayerStats - Elo calculation', () => {
    it('win against equal opponent increases rating by 16', async () => {
      mockQueryItems.mockResolvedValueOnce([makePlayerRecord(1200)]);

      await updatePlayerStats('u1', 'win', 1200);

      const { ExpressionAttributeValues } = mockUpdateItem.mock.calls[0][0];
      // expected=0.5, actual=1 → Δ = round(32 * 0.5) = 16
      expect(ExpressionAttributeValues[':rating']).toBe(1216);
    });

    it('loss against equal opponent decreases rating by 16', async () => {
      mockQueryItems.mockResolvedValueOnce([makePlayerRecord(1200)]);

      await updatePlayerStats('u1', 'loss', 1200);

      const { ExpressionAttributeValues } = mockUpdateItem.mock.calls[0][0];
      // expected=0.5, actual=0 → Δ = round(32 * -0.5) = -16
      expect(ExpressionAttributeValues[':rating']).toBe(1184);
    });

    it('draw against equal opponent keeps rating unchanged', async () => {
      mockQueryItems.mockResolvedValueOnce([makePlayerRecord(1200)]);

      await updatePlayerStats('u1', 'draw', 1200);

      const { ExpressionAttributeValues } = mockUpdateItem.mock.calls[0][0];
      // expected=0.5, actual=0.5 → Δ = 0
      expect(ExpressionAttributeValues[':rating']).toBe(1200);
    });

    it('enforces minimum rating floor of 100', async () => {
      mockQueryItems.mockResolvedValueOnce([makePlayerRecord(103)]);

      // no opponentRating → flat -5 penalty → 98, capped at 100
      await updatePlayerStats('u1', 'loss');

      const { ExpressionAttributeValues } = mockUpdateItem.mock.calls[0][0];
      expect(ExpressionAttributeValues[':rating']).toBe(100);
    });

    it('does nothing when player not found', async () => {
      mockQueryItems.mockResolvedValueOnce([]);

      await updatePlayerStats('nonexistent', 'win', 1200);

      expect(mockUpdateItem).not.toHaveBeenCalled();
    });
  });
});
