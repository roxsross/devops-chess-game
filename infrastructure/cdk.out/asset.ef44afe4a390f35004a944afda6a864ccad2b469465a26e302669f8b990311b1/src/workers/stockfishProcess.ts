/**
 * Stockfish engine child process.
 * Spawned by StockfishManager via child_process.fork().
 * Communicates with parent via IPC (process.send / process.on('message')).
 *
 * Must run in Node.js main thread (isMainThread=true) so the stockfish.js
 * INIT_ENGINE() path is taken instead of the pthread worker stub.
 */
import path from 'path';

const stockfishDir = path.join(__dirname, '../../node_modules/stockfish/src');
const stockfishFile = path.join(stockfishDir, 'stockfish-nnue-16-single.js');

// Force readFileSync fallback for WASM loading — Node.js v18+ has built-in
// fetch that doesn't support absolute file paths, but the Emscripten code
// checks `typeof fetch` and falls back to fs.readFileSync when fetch is absent.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).fetch = undefined;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const STOCKFISH = require(stockfishFile) as (opts: any, wasmPath: string) => (mod: any) => Promise<any>;

let resolveMove: ((move: string) => void) | null = null;

STOCKFISH(null, '')({
  locateFile: (filename: string) => path.join(stockfishDir, filename),
}).then((sf: any) => {
  sf.addMessageListener((line: string) => {
    if (typeof line !== 'string') return;
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const bestMove = parts[1];
      if (bestMove && bestMove !== '(none)' && resolveMove) {
        const resolve = resolveMove;
        resolveMove = null;
        resolve(bestMove);
      }
    }
  });

  sf.queue.put('ucinewgame');
  if (process.send) process.send({ ready: true });

  process.on('message', (msg: { fen: string; depth: number; skillLevel: number; moveTime: number }) => {
    resolveMove = (bestMove: string) => {
      if (process.send) process.send({ bestMove });
    };
    sf.queue.put(`setoption name Skill Level value ${msg.skillLevel}`);
    sf.queue.put(`position fen ${msg.fen}`);
    sf.queue.put(`go depth ${msg.depth} movetime ${msg.moveTime}`);
  });
}).catch((err: unknown) => {
  console.error('[stockfish-process] Failed to initialize:', err);
  process.exit(1);
});
