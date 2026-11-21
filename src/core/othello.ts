/**
 * PUG REVERSI — オセロのコアロジック
 * React に依存しない純粋な関数だけで構成（テスト・Worker・将来のオンライン対戦で共有）
 *
 * 盤面は長さ64の配列。index = row * 8 + col（左上が0）
 * 0 = 空, 1 = 黒パグ, 2 = 白パグ。黒が先手。
 */

export const EMPTY = 0 as const;
export const BLACK = 1 as const;
export const WHITE = 2 as const;
export type Player = typeof BLACK | typeof WHITE;
export type Cell = typeof EMPTY | Player;
export type Board = Cell[];

export const SIZE = 8;
export const CELLS = SIZE * SIZE;

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export const opponent = (p: Player): Player => (p === BLACK ? WHITE : BLACK);
export const idx = (r: number, c: number) => r * SIZE + c;
export const rowOf = (i: number) => Math.floor(i / SIZE);
export const colOf = (i: number) => i % SIZE;

/** 標準の初期配置（d4=白, e4=黒, d5=黒, e5=白） */
export function initialBoard(): Board {
  const b: Board = new Array(CELLS).fill(EMPTY);
  b[idx(3, 3)] = WHITE;
  b[idx(3, 4)] = BLACK;
  b[idx(4, 3)] = BLACK;
  b[idx(4, 4)] = WHITE;
  return b;
}

/** その位置に置いたときに裏返る石の index 一覧（置けない場合は空配列） */
export function getFlips(board: Board, pos: number, player: Player): number[] {
  if (pos < 0 || pos >= CELLS || board[pos] !== EMPTY) return [];
  const opp = opponent(player);
  const r0 = rowOf(pos);
  const c0 = colOf(pos);
  const flips: number[] = [];
  for (const [dr, dc] of DIRS) {
    let r = r0 + dr;
    let c = c0 + dc;
    const line: number[] = [];
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[idx(r, c)] === opp) {
      line.push(idx(r, c));
      r += dr;
      c += dc;
    }
    if (line.length > 0 && r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[idx(r, c)] === player) {
      flips.push(...line);
    }
  }
  return flips;
}

export function isLegal(board: Board, pos: number, player: Player): boolean {
  return getFlips(board, pos, player).length > 0;
}

export function legalMoves(board: Board, player: Player): number[] {
  const moves: number[] = [];
  for (let i = 0; i < CELLS; i++) {
    if (board[i] === EMPTY && getFlips(board, i, player).length > 0) moves.push(i);
  }
  return moves;
}

/** 石を置いた新しい盤面を返す（元の盤面は変更しない）。不正な手なら null */
export function applyMove(board: Board, pos: number, player: Player): { board: Board; flipped: number[] } | null {
  const flipped = getFlips(board, pos, player);
  if (flipped.length === 0) return null;
  const next = board.slice() as Board;
  next[pos] = player;
  for (const f of flipped) next[f] = player;
  return { board: next, flipped };
}

export function countPieces(board: Board): { black: number; white: number; empty: number } {
  let black = 0;
  let white = 0;
  for (const c of board) {
    if (c === BLACK) black++;
    else if (c === WHITE) white++;
  }
  return { black, white, empty: CELLS - black - white };
}

export function isGameOver(board: Board): boolean {
  return legalMoves(board, BLACK).length === 0 && legalMoves(board, WHITE).length === 0;
}

export type Winner = Player | 'draw';
export function winnerOf(board: Board): Winner {
  const { black, white } = countPieces(board);
  if (black > white) return BLACK;
  if (white > black) return WHITE;
  return 'draw';
}

// ---------------------------------------------------------------
// 対局の状態管理（1手ごとのスナップショットで「1手戻す」を実現）
// ---------------------------------------------------------------

export interface MoveRecord {
  player: Player;
  pos: number | null; // null = パス
  flipped: number[];
}

export interface GameState {
  board: Board;
  turn: Player;
  /** 直前の手（演出用） */
  lastMove: MoveRecord | null;
  /** この局面に至るまでの手の記録 */
  moves: MoveRecord[];
  over: boolean;
}

export function newGame(): GameState {
  return { board: initialBoard(), turn: BLACK, lastMove: null, moves: [], over: false };
}

/**
 * 手を打ち、必要なら自動でパスを処理した次の状態を返す。
 * - 次の手番に合法手がなく、相手にはある → パス（記録に残す）
 * - 両者とも合法手なし → 終局
 */
export function playMove(state: GameState, pos: number): GameState | null {
  if (state.over) return null;
  const res = applyMove(state.board, pos, state.turn);
  if (!res) return null;
  const rec: MoveRecord = { player: state.turn, pos, flipped: res.flipped };
  const moves = [...state.moves, rec];
  let turn = opponent(state.turn);
  if (legalMoves(res.board, turn).length === 0) {
    if (legalMoves(res.board, state.turn).length === 0) {
      return { board: res.board, turn, lastMove: rec, moves, over: true };
    }
    moves.push({ player: turn, pos: null, flipped: [] });
    turn = state.turn;
  }
  return { board: res.board, turn, lastMove: rec, moves, over: false };
}

/** 直前の着手でパスが発生したか（UI でお知らせを出すため） */
export function passedAfterLastMove(state: GameState): Player | null {
  const last = state.moves[state.moves.length - 1];
  return last && last.pos === null ? last.player : null;
}

export const COL_LABELS = 'abcdefgh';
export const posLabel = (i: number) => `${COL_LABELS[colOf(i)]}${rowOf(i) + 1}`;
