import type { Server, Socket } from 'socket.io';
import { Chess } from 'chess.js';
import { SOCKET_EVENTS, type GameState, type GameMove } from '../types';
import { getGame, updateGame, addMoveToGame } from '../services/gameService';
import { stockfishManager } from '../engine/stockfishManager';
import { updatePlayerStats } from '../services/playerService';

async function recordGameResult(game: GameState, result: GameState['result']): Promise<void> {
  if (!result) return;
  const { white, black } = game.players;
  // Skip AI games or games with missing players
  if (!white || !black || game.isAiGame) return;

  if (result === 'draw') {
    await Promise.all([
      updatePlayerStats(white.userId, 'draw', black.rating),
      updatePlayerStats(black.userId, 'draw', white.rating),
    ]);
  } else {
    const winnerId     = result === 'white' ? white.userId  : black.userId;
    const loserId      = result === 'white' ? black.userId  : white.userId;
    const winnerRating = result === 'white' ? white.rating  : black.rating;
    const loserRating  = result === 'white' ? black.rating  : white.rating;
    await Promise.all([
      updatePlayerStats(winnerId, 'win',  loserRating),
      updatePlayerStats(loserId,  'loss', winnerRating),
    ]);
  }
}

export function registerGameHandlers(io: Server, socket: Socket) {
  const userId = socket.handshake.auth?.userId as string;

  socket.on(SOCKET_EVENTS.CLIENT.JOIN_GAME, async ({ gameId }: { gameId: string }) => {
    try {
      const game = await getGame(gameId);
      if (!game) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'GAME_NOT_FOUND', message: 'Game not found' });
        return;
      }
      await socket.join(gameId);
      socket.emit(SOCKET_EVENTS.SERVER.GAME_UPDATED, game);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'JOIN_ERROR', message: String(err) });
    }
  });

  socket.on(SOCKET_EVENTS.CLIENT.LEAVE_GAME, ({ gameId }: { gameId: string }) => {
    socket.leave(gameId);
  });

  socket.on(SOCKET_EVENTS.CLIENT.MAKE_MOVE, async ({
    gameId, from, to, promotion,
  }: { gameId: string; from: string; to: string; promotion?: string }) => {
    try {
      const game = await getGame(gameId);
      if (!game) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'GAME_NOT_FOUND', message: 'Game not found' });
        return;
      }
      if (game.status !== 'active') {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'GAME_NOT_ACTIVE', message: 'Game is not active' });
        return;
      }

      const chess = new Chess(game.fen);
      const moveResult = chess.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined });
      if (!moveResult) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'INVALID_MOVE', message: 'Invalid move' });
        return;
      }

      const move: GameMove = {
        from, to, promotion, san: moveResult.san, fen: chess.fen(), timestamp: Date.now(),
      };

      const isCheckmate = chess.isCheckmate();
      const isDraw = chess.isDraw();
      const isStalemate = chess.isStalemate();
      const isCheck = chess.isCheck();
      const newStatus: GameState['status'] = (isCheckmate || isDraw || isStalemate) ? 'completed' : 'active';
      let result: GameState['result'] = null;
      let resultReason: string | undefined;

      if (isCheckmate) {
        result = moveResult.color === 'w' ? 'white' : 'black';
        resultReason = 'checkmate';
      } else if (isDraw) {
        result = 'draw';
        resultReason = isStalemate ? 'stalemate' : 'draw';
      }

      await addMoveToGame(gameId, move, chess.fen(), chess.turn(), {
        status: newStatus, isCheck, isCheckmate, isStalemate, isDraw, result, resultReason,
      });

      const movePayload = { move, fen: chess.fen(), turn: chess.turn(), isCheck, isCheckmate, isStalemate, isDraw, result, resultReason };
      io.to(gameId).emit(SOCKET_EVENTS.SERVER.MOVE_MADE, movePayload);

      if (newStatus === 'completed') {
        io.to(gameId).emit(SOCKET_EVENTS.SERVER.GAME_OVER, { result, reason: resultReason });
        await recordGameResult(game, result);
        if (game.isAiGame) stockfishManager.terminateWorker(gameId);
        return;
      }

      // AI response
      if (game.isAiGame) {
        try {
          const bestMove = await stockfishManager.getBestMove(gameId, chess.fen(), game.difficulty ?? 'medium');
          const [aiFrom, aiTo] = [bestMove.slice(0, 2), bestMove.slice(2, 4)];
          const aiPromotion = bestMove.length === 5 ? bestMove[4] : undefined;

          const aiResult = chess.move({ from: aiFrom, to: aiTo, promotion: aiPromotion as 'q' | 'r' | 'b' | 'n' | undefined });
          if (!aiResult) return;

          const aiMove: GameMove = {
            from: aiFrom, to: aiTo, promotion: aiPromotion, san: aiResult.san, fen: chess.fen(), timestamp: Date.now(),
          };

          const aiIsCheckmate = chess.isCheckmate();
          const aiIsDraw = chess.isDraw();
          const aiIsCheck = chess.isCheck();
          const aiStatus: GameState['status'] = (aiIsCheckmate || aiIsDraw) ? 'completed' : 'active';
          let aiGameResult: GameState['result'] = null;
          let aiResultReason: string | undefined;

          if (aiIsCheckmate) {
            aiGameResult = aiResult.color === 'w' ? 'white' : 'black';
            aiResultReason = 'checkmate';
          } else if (aiIsDraw) {
            aiGameResult = 'draw';
            aiResultReason = 'draw';
          }

          await addMoveToGame(gameId, aiMove, chess.fen(), chess.turn(), {
            status: aiStatus, isCheck: aiIsCheck, isCheckmate: aiIsCheckmate,
            isStalemate: chess.isStalemate(), isDraw: aiIsDraw, result: aiGameResult, resultReason: aiResultReason,
          });

          io.to(gameId).emit(SOCKET_EVENTS.SERVER.MOVE_MADE, {
            move: aiMove, fen: chess.fen(), turn: chess.turn(),
            isCheck: aiIsCheck, isCheckmate: aiIsCheckmate, isStalemate: chess.isStalemate(),
            isDraw: aiIsDraw, result: aiGameResult, resultReason: aiResultReason,
          });

          if (aiStatus === 'completed') {
            io.to(gameId).emit(SOCKET_EVENTS.SERVER.GAME_OVER, { result: aiGameResult, reason: aiResultReason });
            stockfishManager.terminateWorker(gameId);
          }
          // No Elo update for AI games (recordGameResult skips isAiGame)
        } catch (err) {
          console.error('Stockfish error:', err);
        }
      }
    } catch (err) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'MOVE_ERROR', message: String(err) });
    }
  });

  socket.on(SOCKET_EVENTS.CLIENT.RESIGN, async ({ gameId }: { gameId: string }) => {
    try {
      const game = await getGame(gameId);
      if (!game || game.status !== 'active') return;
      const resigningColor = game.players.white?.userId === userId ? 'white' : 'black';
      const winner: GameState['result'] = resigningColor === 'white' ? 'black' : 'white';
      await updateGame(gameId, { status: 'completed', result: winner, resultReason: 'resignation' });
      io.to(gameId).emit(SOCKET_EVENTS.SERVER.GAME_OVER, { result: winner, reason: 'resignation' });
      await recordGameResult(game, winner);
      if (game.isAiGame) stockfishManager.terminateWorker(gameId);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'RESIGN_ERROR', message: String(err) });
    }
  });

  socket.on(SOCKET_EVENTS.CLIENT.OFFER_DRAW, ({ gameId }: { gameId: string }) => {
    socket.to(gameId).emit(SOCKET_EVENTS.SERVER.DRAW_OFFERED, { userId });
  });

  socket.on(SOCKET_EVENTS.CLIENT.ACCEPT_DRAW, async ({ gameId }: { gameId: string }) => {
    try {
      const drawGame = await getGame(gameId);
      if (!drawGame) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'GAME_NOT_FOUND', message: 'Game not found' });
        return;
      }
      if (drawGame.status !== 'active') {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'GAME_NOT_ACTIVE', message: 'Game is not active' });
        return;
      }
      await updateGame(gameId, { status: 'completed', result: 'draw', resultReason: 'agreement' });
      io.to(gameId).emit(SOCKET_EVENTS.SERVER.GAME_OVER, { result: 'draw', reason: 'agreement' });
      await recordGameResult(drawGame, 'draw');
    } catch (err) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'DRAW_ERROR', message: String(err) });
    }
  });

  socket.on(SOCKET_EVENTS.CLIENT.SYNC_REQUEST, async ({ gameId }: { gameId: string }) => {
    try {
      const game = await getGame(gameId);
      if (game) socket.emit(SOCKET_EVENTS.SERVER.GAME_UPDATED, game);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { code: 'SYNC_ERROR', message: String(err) });
    }
  });

  socket.on('disconnect', () => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    for (const gameId of rooms) {
      socket.to(gameId).emit(SOCKET_EVENTS.SERVER.OPPONENT_DISCONNECTED, { userId });
    }
  });
}
