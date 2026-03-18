import { putItem, scanItems, queryItems, updateItem } from './dynamodb';
import { config } from '../config/env';

const TABLE = config.dynamodb.playersTable;

export interface PlayerRecord {
  userId: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  createdAt: string;
  updatedAt: string;
}

export async function upsertPlayer(userId: string, username: string): Promise<PlayerRecord> {
  const items = await queryItems<PlayerRecord & { pk: string; sk: string }>({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': userId },
  });
  if (items.length > 0) {
    const { pk, sk, ...record } = items[0];
    return record as PlayerRecord;
  }

  const now = new Date().toISOString();
  const player: PlayerRecord & { pk: string; sk: string } = {
    pk: userId,
    sk: username,
    userId,
    username,
    rating: 1200,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDraw: 0,
    createdAt: now,
    updatedAt: now,
  };
  await putItem(TABLE, player as unknown as Record<string, unknown>);
  const { pk, sk, ...record } = player;
  return record;
}

export async function getPlayer(userId: string): Promise<PlayerRecord | null> {
  const items = await queryItems<PlayerRecord & { pk: string; sk: string }>({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': userId },
  });
  if (!items.length) return null;
  const { pk, sk, ...record } = items[0];
  return record as PlayerRecord;
}

export async function updatePlayerStats(
  userId: string,
  result: 'win' | 'loss' | 'draw',
  opponentRating?: number
): Promise<void> {
  const items = await queryItems<PlayerRecord & { pk: string; sk: string }>({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': userId },
  });
  if (!items.length) return;
  const { pk, sk, ...player } = items[0];

  const K = 32;
  let ratingChange: number;
  if (opponentRating != null) {
    const expected = 1 / (1 + Math.pow(10, (opponentRating - player.rating) / 400));
    const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    ratingChange = Math.round(K * (actual - expected));
  } else {
    ratingChange = result === 'win' ? 10 : result === 'draw' ? 3 : -5;
  }

  const statField =
    result === 'win' ? 'gamesWon' : result === 'loss' ? 'gamesLost' : 'gamesDraw';

  await updateItem({
    TableName: TABLE,
    Key: { pk, sk },
    UpdateExpression: `SET rating = :rating, gamesPlayed = gamesPlayed + :one, ${statField} = ${statField} + :one, updatedAt = :now`,
    ExpressionAttributeValues: {
      ':rating': Math.max(100, player.rating + ratingChange),
      ':one': 1,
      ':now': new Date().toISOString(),
    },
  });
}

export async function getLeaderboard(): Promise<PlayerRecord[]> {
  const items = await scanItems<PlayerRecord & { pk: string; sk: string }>(TABLE);
  return items
    .map(({ pk, sk, ...record }) => record as PlayerRecord)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 20);
}
