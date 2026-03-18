import { useEffect } from 'react';
import { getSocket } from '../lib/socket';
import { SOCKET_EVENTS } from '../types';
import { useGameStore } from '../store/gameStore';
import { useLobbyStore } from '../store/lobbyStore';
import type { GameState, LobbyRoom } from '../types';

export function useSocket() {
  const { setGame, applyMove, setGameOver, setDrawOfferedBy, setOpponentDisconnected } =
    useGameStore();
  const { setRooms } = useLobbyStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on(SOCKET_EVENTS.SERVER.GAME_UPDATED, (game: GameState) => setGame(game));
    socket.on(SOCKET_EVENTS.SERVER.MOVE_MADE, (payload: Parameters<typeof applyMove>[0]) =>
      applyMove(payload)
    );
    socket.on(
      SOCKET_EVENTS.SERVER.GAME_OVER,
      ({ result, reason }: { result: Parameters<typeof setGameOver>[0]; reason?: string }) =>
        setGameOver(result, reason)
    );
    socket.on(SOCKET_EVENTS.SERVER.LOBBY_UPDATED, (rooms: LobbyRoom[]) => setRooms(rooms));
    socket.on(SOCKET_EVENTS.SERVER.DRAW_OFFERED, ({ userId }: { userId: string }) =>
      setDrawOfferedBy(userId)
    );
    socket.on(SOCKET_EVENTS.SERVER.OPPONENT_DISCONNECTED, () => setOpponentDisconnected(true));
    socket.on(SOCKET_EVENTS.SERVER.OPPONENT_JOINED, () => setOpponentDisconnected(false));

    return () => {
      socket.off(SOCKET_EVENTS.SERVER.GAME_UPDATED);
      socket.off(SOCKET_EVENTS.SERVER.MOVE_MADE);
      socket.off(SOCKET_EVENTS.SERVER.GAME_OVER);
      socket.off(SOCKET_EVENTS.SERVER.LOBBY_UPDATED);
      socket.off(SOCKET_EVENTS.SERVER.DRAW_OFFERED);
      socket.off(SOCKET_EVENTS.SERVER.OPPONENT_DISCONNECTED);
      socket.off(SOCKET_EVENTS.SERVER.OPPONENT_JOINED);
    };
  }, [setGame, applyMove, setGameOver, setRooms, setDrawOfferedBy, setOpponentDisconnected]);

  return getSocket();
}
