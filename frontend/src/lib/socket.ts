import { io, type Socket } from 'socket.io-client';
import { WS_URL } from '../config/constants';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const userId = localStorage.getItem('chess_user_id');
    const username = localStorage.getItem('chess_username') ?? 'Anonymous';
    socket = io(WS_URL, {
      auth: { userId, username },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      // App Runner's load balancer blocks WebSocket upgrades; use polling only.
      // socket.io polling provides equivalent functionality for a chess game.
      transports: ['polling'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
