/**
 * PUG REVERSI — CPU 思考ルーチン
 *  EASY   : ランダム選択が基本（ときどき多く取れる手を選ぶ）
 *  NORMAL : 角・辺・可動性を考慮した評価関数で 2 手読み
 *  HARD   : 反復深化 + Negamax(α-β枝刈り) + 終盤完全読み、時間制限つき
 */
import {
  type Board, type Player, BLACK, EMPTY, CELLS,
  getFlips, legalMoves, opponent, countPieces,
} from './othello';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface AIOptions {
  /** HARD の思考時間上限（ミリ秒） */
  timeLimitMs?: number;
  /** テスト用の乱数 */
  random?: () => number;
}

// 位置の重み（角が最重要、角の隣 X/C は危険）
// prettier-ignore
export const WEIGHTS: readonly number[] = [
  120, -20,  20,   5,   5,  20, -20, 120,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
   20,  -5,  15,   3,   3,  15,  -5,  20,
    5,  -5,   3,   3,   3,   3,  -5,   5,
    5,  -5,   3,   3,   3,   3,  -5,   5,
   20,  -5,  15,   3,   3,  15,  -5,  20,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
  120, -20,  20,   5,   5,  20, -20, 120,
];

const CORNERS = [0, 7, 56, 63];
// 角が空いているときだけ危険な X 打ち（角の斜め隣）と C 打ち（角の縦横隣）
const CORNER_NEIGHBORS: Record<number, number[]> = {
  0: [1, 8, 9],
  7: [6, 15, 14],
  56: [48, 57, 49],
  63: [62, 55, 54],
};

function countMoves(board: Board, p: Player): number {
  let n = 0;
  for (let i = 0; i < CELLS; i++) if (board[i] === EMPTY && getFlips(board, i, p).length) n++;
  return n;
}

/** player から見た局面評価（大きいほど player 有利） */
export function evaluate(board: Board, player: Player): number {
  const opp = opponent(player);
  let pos = 0;
  for (let i = 0; i < CELLS; i++) {
    const c = board[i];
    if (c === EMPTY) continue;
    let w = WEIGHTS[i];
    // 角が既に埋まっていれば、その周辺の減点は無効にする
    for (const corner of CORNERS) {
      if (board[corner] !== EMPTY && CORNER_NEIGHBORS[corner].includes(i)) { w = 8; break; }
    }
    pos += c === player ? w : -w;
  }
  const myMob = countMoves(board, player);
  const opMob = countMoves(board, opp);
  const mob = myMob + opMob === 0 ? 0 : (100 * (myMob - opMob)) / (myMob + opMob + 2);

  let corner = 0;
  for (const cidx of CORNERS) {
    if (board[cidx] === player) corner += 1;
    else if (board[cidx] === opp) corner -= 1;
  }
  const { black, white, empty } = countPieces(board);
  const discDiff = player === BLACK ? black - white : white - black;
  // 序盤は石数を少なめに、終盤ほど石数を重視
  const discWeight = empty < 16 ? 4 : empty < 40 ? 0 : -1;
  return pos + mob * 2 + corner * 60 + discDiff * discWeight;
}

// ---------------------------------------------------------------
// 探索
// ---------------------------------------------------------------

class TimeUp extends Error {}

interface SearchCtx {
  deadline: number;
  nodes: number;
}

function orderMoves(moves: number[]): number[] {
  return moves.slice().sort((a, b) => WEIGHTS[b] - WEIGHTS[a]);
}

function negamax(
  board: Board, player: Player, depth: number, alpha: number, beta: number,
  ctx: SearchCtx, passed: boolean, exact: boolean,
): number {
  if ((++ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) throw new TimeUp();

  const moves = legalMoves(board, player);
  if (moves.length === 0) {
    if (passed) {
      // 両者パス = 終局。石差を大きな値で返す
      const { black, white } = countPieces(board);
      const diff = player === BLACK ? black - white : white - black;
      return diff * 10000;
    }
    return -negamax(board, opponent(player), depth, -beta, -alpha, ctx, true, exact);
  }
  if (depth <= 0 && !exact) return evaluate(board, player);

  let best = -Infinity;
  for (const m of orderMoves(moves)) {
    const flips = getFlips(board, m, player);
    // make
    board[m] = player;
    for (const f of flips) board[f] = player;
    const score = -negamax(board, opponent(player), depth - 1, -beta, -alpha, ctx, false, exact);
    // unmake
    board[m] = EMPTY;
    const opp = opponent(player);
    for (const f of flips) board[f] = opp;

    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function searchRoot(board: Board, player: Player, depth: number, ctx: SearchCtx, exact: boolean, firstMove?: number) {
  let moves = orderMoves(legalMoves(board, player));
  if (firstMove !== undefined) moves = [firstMove, ...moves.filter((m) => m !== firstMove)];
  let bestMove = moves[0];
  let alpha = -Infinity;
  const work = board.slice() as Board;
  for (const m of moves) {
    const flips = getFlips(work, m, player);
    work[m] = player;
    for (const f of flips) work[f] = player;
    const score = -negamax(work, opponent(player), depth - 1, -Infinity, -alpha, ctx, false, exact);
    work[m] = EMPTY;
    for (const f of flips) work[f] = opponent(player);
    if (score > alpha) { alpha = score; bestMove = m; }
  }
  return { move: bestMove, score: alpha };
}

function pickEasy(board: Board, player: Player, rnd: () => number): number {
  const moves = legalMoves(board, player);
  if (rnd() < 0.2) {
    // ときどき一番多く返せる手
    let best = moves[0];
    let n = -1;
    for (const m of moves) {
      const f = getFlips(board, m, player).length;
      if (f > n) { n = f; best = m; }
    }
    return best;
  }
  return moves[Math.floor(rnd() * moves.length)];
}

function pickNormal(board: Board, player: Player, rnd: () => number): number {
  const moves = legalMoves(board, player);
  const ctx: SearchCtx = { deadline: Infinity, nodes: 0 };
  const scored = moves.map((m) => {
    const work = board.slice() as Board;
    const flips = getFlips(work, m, player);
    work[m] = player;
    for (const f of flips) work[f] = player;
    // 2 手読み（自分の手 → 相手の最善応手）
    const s = -negamax(work, opponent(player), 1, -Infinity, Infinity, ctx, false, false);
    return { m, s };
  });
  const top = Math.max(...scored.map((x) => x.s));
  // 最善に近い手からランダムに選んで、毎回同じ展開にならないようにする
  const near = scored.filter((x) => x.s >= top - 6);
  return near[Math.floor(rnd() * near.length)].m;
}

export function pickHard(board: Board, player: Player, timeLimitMs = 900): { move: number; depth: number } {
  const moves = legalMoves(board, player);
  if (moves.length === 1) return { move: moves[0], depth: 0 };
  const start = Date.now();
  const ctx: SearchCtx = { deadline: start + timeLimitMs, nodes: 0 };
  const empties = countPieces(board).empty;

  let best = orderMoves(moves)[0];
  let reached = 0;

  // 終盤は最後まで読み切りを試みる
  if (empties <= 12) {
    try {
      const r = searchRoot(board, player, empties, ctx, true);
      return { move: r.move, depth: empties };
    } catch (e) {
      if (!(e instanceof TimeUp)) throw e;
      ctx.deadline = Date.now() + Math.max(200, timeLimitMs / 2);
    }
  }

  for (let d = 1; d <= Math.min(empties, 12); d++) {
    try {
      const r = searchRoot(board, player, d, ctx, false, best);
      best = r.move;
      reached = d;
      if (Math.abs(r.score) >= 10000) break; // 勝敗が確定
    } catch (e) {
      if (e instanceof TimeUp) break;
      throw e;
    }
  }
  return { move: best, depth: reached };
}

/** 難易度に応じて着手を選ぶ。合法手がなければ -1 */
export function chooseMove(board: Board, player: Player, level: Difficulty, opts: AIOptions = {}): number {
  const rnd = opts.random ?? Math.random;
  if (legalMoves(board, player).length === 0) return -1;
  switch (level) {
    case 'easy': return pickEasy(board, player, rnd);
    case 'normal': return pickNormal(board, player, rnd);
    case 'hard': return pickHard(board, player, opts.timeLimitMs ?? 900).move;
  }
}

/** ヒント用：素早く良い手を返す */
export function hintMove(board: Board, player: Player): number {
  if (legalMoves(board, player).length === 0) return -1;
  return pickHard(board, player, 250).move;
}

