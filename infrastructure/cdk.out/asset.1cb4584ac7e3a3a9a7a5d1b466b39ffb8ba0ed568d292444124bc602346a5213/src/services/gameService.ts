import { v4 as uuidv4 } from 'uuid';
import { putItem, updateItem, scanItems, queryItems } from './dynamodb';
import { config } from '../config/env';
import type { GameState, GameMove, Player, DifficultyLevel } from '../types';

const TABLE = config.dynamodb.gamesTable;

export async function createGame(params: {
  creator: Player;
  isAiGame: boolean;
  difficulty?: DifficultyLevel;
  timeControl?: number;
  creatorColor?: 'w' | 'b';
}): Promise<GameState> {
  const gameId = uuidv4();
  const now = new Date().toISOString();
  const creatorColor = params.creatorColor ?? 'w';

  const game: GameState = {
    gameId,
    status: params.isAiGame ? 'active' : 'waiting',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'w',
    moves: [],
    players: {
      white: creatorColor === 'w' ? { ...params.creator, color: 'w' } : null,
      black: creatorColor === 'b' ? { ...params.creator, color: 'b' } : null,
    },
    result: null,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    createdAt: now,
    updatedAt: now,
    isAiGame: params.isAiGame,
    difficulty: params.difficulty,
    timeControl: params.timeControl ?? 600,
    timeRemaining: {
      white: params.timeControl ?? 600,
      black: params.timeControl ?? 600,
    },
  };

  await putItem(TABLE, { ...game, pk: gameId, sk: now });
  return game;
}

export async function getGame(gameId: string): Promise<GameState | null> {
  const items = await queryItems<GameState & { pk: string; sk: string }>({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': gameId },
  });
  if (!items.length) return null;
  const { pk, sk, ...game } = items[0];
  return game as GameState;
}

export async function getGameWithKey(gameId: string): Promise<(GameState & { pk: string; sk: string }) | null> {
  const items = await queryItems<GameState & { pk: string; sk: string }>({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': gameId },
  });
  return items[0] ?? null;
}

export async function updateGame(gameId: string, updates: Partial<GameState>): Promise<void> {
  const item = await getGameWithKey(gameId);
  if (!item) throw new Error(`Game ${gameId} not found`);

  const now = new Date().toISOString();
  const setExpressions: string[] = ['updatedAt = :updatedAt'];
  const expressionValues: Record<string, unknown> = { ':updatedAt': now };
  const expressionNames: Record<string, string> = {};

  const reservedWords = new Set(['status', 'turn', 'result']);

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'gameId' || key === 'createdAt') continue;
    if (value === undefined) continue;
    const alias = reservedWords.has(key) ? `#${key}` : key;
    if (reservedWords.has(key)) expressionNames[`#${key}`] = key;
    setExpressions.push(`${alias} = :${key}`);
    expressionValues[`:${key}`] = value;
  }

  await updateItem({
    TableName: TABLE,
    Key: { pk: gameId, sk: item.sk },
    UpdateExpression: `SET ${setExpressions.join(', ')}`,
    ExpressionAttributeValues: expressionValues,
    ...(Object.keys(expressionNames).length > 0 ? { ExpressionAttributeNames: expressionNames } : {}),
  });
}

export async function addMoveToGame(
  gameId: string,
  move: GameMove,
  newFen: string,
  turn: 'w' | 'b',
  gameUpdates: Partial<GameState>
): Promise<void> {
  const game = await getGame(gameId);
  if (!game) throw new Error(`Game ${gameId} not found`);

  await updateGame(gameId, {
    ...gameUpdates,
    fen: newFen,
    turn,
    moves: [...(game.moves ?? []), move],
  });
}

export async function cancelGame(gameId: string, requestingUserId: string): Promise<boolean> {
  const game = await getGame(gameId);
  if (!game) return false;
  if (game.status !== 'waiting') return false;
  const creatorId = game.players.white?.userId ?? game.players.black?.userId;
  if (creatorId !== requestingUserId) return false;
  await updateGame(gameId, { status: 'abandoned' });
  return true;
}

export async function listWaitingGames(): Promise<GameState[]> {
  const items = await scanItems<GameState & { pk: string; sk: string }>(
    TABLE,
    '#status = :status AND isAiGame = :notAi',
    { ':status': 'waiting', ':notAi': false },
    { '#status': 'status' }
  );
  return items.map(({ pk, sk, ...game }) => game as GameState);
}
