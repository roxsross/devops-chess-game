import { describe, it, expect } from 'vitest';
import { upsertPlayerSchema } from '../../routes/players';

// These tests validate the Zod schema used in POST /api/v1/players
// without requiring a running Express app or DynamoDB connection.
describe('POST /api/v1/players - input validation schema', () => {
  it('rejects missing userId', () => {
    const result = upsertPlayerSchema.safeParse({ username: 'Alice' });
    expect(result.success).toBe(false);
  });

  it('rejects missing username', () => {
    const result = upsertPlayerSchema.safeParse({ userId: 'u1' });
    expect(result.success).toBe(false);
  });

  it('rejects empty userId', () => {
    const result = upsertPlayerSchema.safeParse({ userId: '', username: 'Alice' });
    expect(result.success).toBe(false);
  });

  it('rejects empty username', () => {
    const result = upsertPlayerSchema.safeParse({ userId: 'u1', username: '' });
    expect(result.success).toBe(false);
  });

  it('rejects userId exceeding 128 characters', () => {
    const result = upsertPlayerSchema.safeParse({ userId: 'a'.repeat(129), username: 'Alice' });
    expect(result.success).toBe(false);
  });

  it('rejects username exceeding 50 characters', () => {
    const result = upsertPlayerSchema.safeParse({ userId: 'u1', username: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('accepts valid userId and username', () => {
    const result = upsertPlayerSchema.safeParse({ userId: 'u1', username: 'Alice' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe('u1');
      expect(result.data.username).toBe('Alice');
    }
  });

  it('accepts userId at maximum length boundary (128 chars)', () => {
    const result = upsertPlayerSchema.safeParse({ userId: 'a'.repeat(128), username: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('accepts username at maximum length boundary (50 chars)', () => {
    const result = upsertPlayerSchema.safeParse({ userId: 'u1', username: 'a'.repeat(50) });
    expect(result.success).toBe(true);
  });
});
