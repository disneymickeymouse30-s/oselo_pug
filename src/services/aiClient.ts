/**
 * CPU 思考を Web Worker で実行するクライアント。
 * Worker が使えない環境では setTimeout で同期実行にフォールバックする。
 */
import { chooseMove, hintMove, type Difficulty } from '../core/ai';
import type { Board, Player } from '../core/othello';
import type { AIRequest } from '../core/ai.worker';

let worker: Worker | null = null;
let workerBroken = false;
let seq = 0;
const pending = new Map<number, (move: number) => void>();

function getWorker(): Worker | null {
  if (workerBroken) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../core/ai.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; move: number }>) => {
      const cb = pending.get(e.data.id);
      pending.delete(e.data.id);
      cb?.(e.data.move);
    };
    worker.onerror = () => {
      // Worker が壊れたら、待っている依頼をすべて同期実行で処理する
      workerBroken = true;
      worker = null;
    };
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

function runSync(req: AIRequest): Promise<number> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(req.kind === 'hint' ? hintMove(req.board, req.player) : chooseMove(req.board, req.player, req.level)), 0),
  );
}

export function requestAI(kind: 'move' | 'hint', board: Board, player: Player, level: Difficulty): Promise<number> {
  const id = ++seq;
  const req: AIRequest = { id, kind, board, player, level };
  const w = getWorker();
  if (!w) return runSync(req);
  return new Promise((resolve) => {
    // 3秒応答がなければ同期実行で救済
    const timer = setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); runSync(req).then(resolve); }
    }, 3000);
    pending.set(id, (m) => { clearTimeout(timer); resolve(m); });
    w.postMessage(req);
  });
}
