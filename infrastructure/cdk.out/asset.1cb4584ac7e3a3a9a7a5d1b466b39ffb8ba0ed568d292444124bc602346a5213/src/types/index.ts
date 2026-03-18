export type GameStatus = 'waiting' | 'active' | 'completed' | 'abandoned';
export type GameResult = 'white' | 'black' | 'draw' | null;
export type PieceColor = 'w' | 'b';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface Player {
  userId: string;
  username: string;
  rating: number;
  color?: PieceColor;
  isConnected?: boolean;
}

export interface GameMove {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  fen: string;
  timestamp: number;
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  fen: string;
  turn: PieceColor;
  moves: GameMove[];
  players: { white: Player | null; black: Player | null };
  result: GameResult;
  resultReason?: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  createdAt: string;
  updatedAt: string;
  isAiGame: boolean;
  difficulty?: DifficultyLevel;
  timeControl?: number;
  timeRemaining?: { white: number; black: number };
}

export interface LobbyRoom {
  gameId: string;
  players: { white: Player | null; black: Player | null };
  timeControl: number;
  createdAt: string;
  status: GameStatus;
}

export const SOCKET_EVENTS = {
  CLIENT: {
    JOIN_GAME: 'join_game',
    LEAVE_GAME: 'leave_game',
    MAKE_MOVE: 'make_move',
    REQUEST_AI_MOVE: 'request_ai_move',
    OFFER_DRAW: 'offer_draw',
    ACCEPT_DRAW: 'accept_draw',
    RESIGN: 'resign',
    GET_LOBBY: 'get_lobby',
    CREATE_ROOM: 'create_room',
    JOIN_ROOM: 'join_room',
    CANCEL_ROOM: 'cancel_room',
    SYNC_REQUEST: 'sync_request',
  },
  SERVER: {
    GAME_UPDATED: 'game_updated',
    MOVE_MADE: 'move_made',
    GAME_OVER: 'game_over',
    DRAW_OFFERED: 'draw_offered',
    LOBBY_UPDATED: 'lobby_updated',
    ROOM_CREATED: 'room_created',
    OPPONENT_JOINED: 'opponent_joined',
    OPPONENT_DISCONNECTED: 'opponent_disconnected',
    ERROR: 'error',
    CONNECTED: 'connected',
  },
} as const;
