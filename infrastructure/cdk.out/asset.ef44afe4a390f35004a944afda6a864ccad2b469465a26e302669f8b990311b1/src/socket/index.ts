import type { Server } from 'socket.io';
import { registerGameHandlers } from './gameHandler';
import { registerLobbyHandlers } from './lobbyHandler';
import { upsertPlayer } from '../services/playerService';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;
    const username = (socket.handshake.auth?.username as string) ?? 'Anonymous';

    // Register handlers immediately — before any async work,
    // so events emitted right after connect() are not dropped.
    registerLobbyHandlers(io, socket);
    registerGameHandlers(io, socket);

    console.log(`[socket] connected: ${socket.id} (user: ${username})`);
    socket.emit('connected', { socketId: socket.id });

    // Upsert player in background — non-blocking
    if (userId) {
      upsertPlayer(userId, username).catch((err) =>
        console.error('Failed to upsert player on connect:', err)
      );
    }

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });
}
