import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../types';
import { createGame, getGame, listWaitingGames, updateGame, cancelGame } from '../services/gameService';
import { upsertPlayer } from '../services/playerService';

export function registerLobbyHandlers(io: Server, socket: Socket) {
  const userId = socket.handshake.auth?.userId as string;
  const username = (socket.handshake.auth?.username as string) ?? 'Anonymous';

  socket.on(SOCKET_EVENTS.CLIENT.GET_LOBBY, async () => {
    try {
      const rooms = await listWaitingGames();
      socket.emit(SOCKET_EVENTS.SERVER.LOBBY_UPDATED, rooms);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'LOBBY_ERROR', message: String(err) });
    }
  });

  socket.on(SOCKET_EVENTS.CLIENT.CREATE_ROOM, async ({
    timeControl = 600, color = 'w', difficulty, isAiGame = false,
  }: { timeControl?: number; color?: 'w' | 'b'; difficulty?: string; isAiGame?: boolean }) => {
    try {
      const player = await upsertPlayer(userId, username);
      const game = await createGame({
        creator: { userId: player.userId, username: player.username, rating: player.rating },
        isAiGame,
        difficulty: difficulty as any,
        timeControl,
        creatorColor: color,
      });

      await socket.join(game.gameId);
      socket.emit(SOCKET_EVENTS.SERVER.ROOM_CREATED, { gameId: game.gameId, game });

      if (!isAiGame) {
        const rooms = await listWaitingGames();
        io.emit(SOCKET_EVENTS.SERVER.LOBBY_UPDATED, rooms);
      }
    } catch (err) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'CREATE_ROOM_ERROR', message: String(err) });
    }
  });

  socket.on(SOCKET_EVENTS.CLIENT.CANCEL_ROOM, async ({ gameId }: { gameId: string }) => {
    try {
      const cancelled = await cancelGame(gameId, userId);
      if (!cancelled) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'CANCEL_ERROR', message: 'Cannot cancel this room' });
        return;
      }
      socket.leave(gameId);
      const rooms = await listWaitingGames();
      io.emit(SOCKET_EVENTS.SERVER.LOBBY_UPDATED, rooms);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'CANCEL_ERROR', message: String(err) });
    }
  });

  socket.on(SOCKET_EVENTS.CLIENT.JOIN_ROOM, async ({ gameId }: { gameId: string }) => {
    try {
      const game = await getGame(gameId);
      if (!game) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'GAME_NOT_FOUND', message: 'Room not found' });
        return;
      }
      if (game.status !== 'waiting') {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'ROOM_FULL', message: 'Room is not available' });
        return;
      }

      const joiner = await upsertPlayer(userId, username);
      const joinerPlayer = { userId: joiner.userId, username: joiner.username, rating: joiner.rating };

      const updatedPlayers = { ...game.players };
      if (!game.players.white) {
        updatedPlayers.white = { ...joinerPlayer, color: 'w' };
      } else {
        updatedPlayers.black = { ...joinerPlayer, color: 'b' };
      }

      await updateGame(gameId, { status: 'active', players: updatedPlayers });
      await socket.join(gameId);

      io.to(gameId).emit(SOCKET_EVENTS.SERVER.OPPONENT_JOINED, { player: joinerPlayer });
      const updatedGame = await getGame(gameId);
      io.to(gameId).emit(SOCKET_EVENTS.SERVER.GAME_UPDATED, updatedGame);

      const rooms = await listWaitingGames();
      io.emit(SOCKET_EVENTS.SERVER.LOBBY_UPDATED, rooms);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'JOIN_ROOM_ERROR', message: String(err) });
    }
  });
}
