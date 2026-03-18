import { fork, type ChildProcess } from 'child_process';
import path from 'path';
import type { DifficultyLevel } from '../types';

const DIFFICULTY_CONFIG: Record<DifficultyLevel, { skillLevel: number; depth: number; moveTime: number }> = {
  easy:   { skillLevel: 2,  depth: 5,  moveTime: 500 },
  medium: { skillLevel: 8,  depth: 10, moveTime: 1000 },
  hard:   { skillLevel: 15, depth: 15, moveTime: 2000 },
  expert: { skillLevel: 20, depth: 20, moveTime: 3000 },
};

interface EngineProcess {
  proc: ChildProcess;
  ready: boolean;
  readyCallbacks: Array<() => void>;
}

export class StockfishManager {
  private processes = new Map<string, EngineProcess>();

  private getProcess(gameId: string): EngineProcess {
    if (!this.processes.has(gameId)) {
      // In dev (tsx), source is .ts; in prod (compiled), it's .js
      const ext = __filename.endsWith('.ts') ? '.ts' : '.js';
      const processPath = path.join(__dirname, `../workers/stockfishProcess${ext}`);

      // Use tsx CJS hook for TypeScript source in dev mode
      const execArgv =
        ext === '.ts'
          ? ['--require', require.resolve(path.join(__dirname, '../../node_modules/tsx/dist/cjs/index.cjs'))]
          : [];

      const proc = fork(processPath, [], { execArgv, silent: false });

      const entry: EngineProcess = { proc, ready: false, readyCallbacks: [] };

      proc.on('message', (msg: { ready?: boolean; bestMove?: string }) => {
        if (msg.ready) {
          entry.ready = true;
          const cbs = entry.readyCallbacks.splice(0);
          cbs.forEach((cb) => cb());
        }
      });

      proc.on('error', (err) => {
        console.error(`Stockfish process error for game ${gameId}:`, err);
        this.processes.delete(gameId);
      });

      proc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.warn(`Stockfish process exited with code ${code} for game ${gameId}`);
        }
        this.processes.delete(gameId);
      });

      this.processes.set(gameId, entry);
    }
    return this.processes.get(gameId)!;
  }

  async getBestMove(gameId: string, fen: string, difficulty: DifficultyLevel): Promise<string> {
    const cfg = DIFFICULTY_CONFIG[difficulty];
    const entry = this.getProcess(gameId);

    // Wait for the process to be ready
    await new Promise<void>((resolve) => {
      if (entry.ready) return resolve();
      entry.readyCallbacks.push(resolve);
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Stockfish timeout'));
      }, cfg.moveTime + 8000);

      const handler = (msg: { bestMove?: string; error?: string }) => {
        if (msg.bestMove || msg.error) {
          clearTimeout(timeout);
          entry.proc.off('message', handler);
          if (msg.error) reject(new Error(msg.error));
          else if (msg.bestMove) resolve(msg.bestMove);
          else reject(new Error('No move returned'));
        }
      };

      entry.proc.on('message', handler);
      entry.proc.send({ fen, ...cfg });
    });
  }

  terminateProcess(gameId: string): void {
    const entry = this.processes.get(gameId);
    if (entry) {
      entry.proc.kill();
      this.processes.delete(gameId);
    }
  }

  terminateWorker(gameId: string): void {
    this.terminateProcess(gameId);
  }

  terminateAll(): void {
    for (const [id] of this.processes) {
      this.terminateProcess(id);
    }
  }
}

export const stockfishManager = new StockfishManager();
