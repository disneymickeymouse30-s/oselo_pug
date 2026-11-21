import { describe, it, expect } from 'vitest';
import {
  initialBoard, legalMoves, applyMove, getFlips, countPieces, isGameOver, newGame, playMove,
  BLACK, WHITE, EMPTY, idx, posLabel, winnerOf, type Board, type Player, opponent,
} from '../src/core/othello';
import { chooseMove, type Difficulty } from '../src/core/ai';

const fromRows = (rows: string[]): Board =>
  rows.join('').split('').map((ch) => (ch === 'B' ? BLACK : ch === 'W' ? WHITE : EMPTY)) as Board;

describe('オセロのルール', () => {
  it('初期配置は黒2・白2・空き60', () => {
    expect(countPieces(initialBoard())).toEqual({ black: 2, white: 2, empty: 60 });
  });

  it('黒の初手の合法手は d3 / c4 / f5 / e6 の4つ', () => {
    const moves = legalMoves(initialBoard(), BLACK).map(posLabel).sort();
    expect(moves).toEqual(['c4', 'd3', 'e6', 'f5']);
  });

  it('置いた石に挟まれた石が裏返る', () => {
    const r = applyMove(initialBoard(), idx(2, 3), BLACK)!;
    expect(r.flipped).toEqual([idx(3, 3)]);
    expect(countPieces(r.board)).toEqual({ black: 4, white: 1, empty: 59 });
  });

  it('置けないマス・埋まったマスには置けない', () => {
    expect(applyMove(initialBoard(), idx(0, 0), BLACK)).toBeNull();
    expect(applyMove(initialBoard(), idx(3, 3), BLACK)).toBeNull();
  });

  it('複数方向を同時に裏返す', () => {
    const b = fromRows([
      'B.B.B...',
      '.WWW....',
      'BW.WB...',
      '.WWW....',
      'B.B.B...',
      '........',
      '........',
      '........',
    ]);
    expect(getFlips(b, idx(2, 2), BLACK).length).toBe(8);
  });

  it('元の盤面は変更されない（イミュータブル）', () => {
    const b = initialBoard();
    const copy = b.slice();
    applyMove(b, idx(2, 3), BLACK);
    expect(b).toEqual(copy);
  });

  // 既知の perft 値（パスを1手と数えない標準値）で合法手生成を検証
  it('perft: 深さ1〜5の局面数が既知の値と一致する', () => {
    const perft = (b: Board, p: Player, d: number, passed = false): number => {
      if (d === 0) return 1;
      const moves = legalMoves(b, p);
      if (moves.length === 0) return passed ? 1 : perft(b, opponent(p), d, true);
      let n = 0;
      for (const m of moves) n += perft(applyMove(b, m, p)!.board, opponent(p), d - 1);
      return n;
    };
    expect([1, 2, 3, 4, 5].map((d) => perft(initialBoard(), BLACK, d))).toEqual([4, 12, 56, 244, 1396]);
  });

  it('打てない側は自動的にパスになる', () => {
    // 黒が a1 に打つと白は打てる場所がなく、黒の手番が続く
    const b = fromRows([
      '.WB.....',
      'WW......',
      'B.B.....',
      '........',
      '........',
      '........',
      '........',
      '........',
    ]);
    const s = playMove({ board: b, turn: BLACK, lastMove: null, moves: [], over: false }, idx(0, 0))!;
    expect(s.over).toBe(true); // 白も黒も打てない → 終局
    const b2 = fromRows([
      '.WB.....',
      'W.......',
      'B.......',
      '........',
      '........',
      '.......W',
      '.......W',
      '.......B',
    ]);
    // a1 に黒 → a2,b1 が黒に。白は打てない。黒は h5 に打てる → パス
    const s2 = playMove({ board: b2, turn: BLACK, lastMove: null, moves: [], over: false }, idx(0, 0))!;
    expect(s2.over).toBe(false);
    expect(s2.turn).toBe(BLACK);
    expect(s2.moves.at(-1)).toEqual({ player: WHITE, pos: null, flipped: [] });
  });

  it('盤面が埋まると終局し、勝者を判定する', () => {
    const b = new Array(64).fill(BLACK) as Board;
    b[63] = WHITE;
    expect(isGameOver(b)).toBe(true);
    expect(winnerOf(b)).toBe(BLACK);
  });

  it('newGame は黒番から始まる', () => {
    expect(newGame().turn).toBe(BLACK);
  });
});

describe('CPU', () => {
  const playOut = (black: Difficulty, white: Difficulty, seed: number) => {
    let s = seed;
    const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    let g = newGame();
    while (!g.over) {
      const lvl = g.turn === BLACK ? black : white;
      const m = chooseMove(g.board, g.turn, lvl, { random: rnd, timeLimitMs: 120 });
      expect(legalMoves(g.board, g.turn)).toContain(m);
      g = playMove(g, m)!;
    }
    return winnerOf(g.board);
  };

  it('全難易度が常に合法手を返し、対局を最後まで進められる', () => {
    for (const lvl of ['easy', 'normal', 'hard'] as Difficulty[]) {
      expect(['draw', BLACK, WHITE]).toContain(playOut(lvl, lvl, 7));
    }
  }, 60000);

  it('HARD は角が取れるなら角を取る', () => {
    const b = fromRows([
      '........',
      '.W......',
      '..B.....',
      '...BW...',
      '...WB...',
      '........',
      '........',
      '........',
    ]);
    expect(chooseMove(b, BLACK, 'hard', { timeLimitMs: 300 })).toBe(idx(0, 0));
  });

  it('NORMAL は EASY に勝ち越す', () => {
    let wins = 0;
    for (let i = 0; i < 10; i++) {
      const normalIsBlack = i % 2 === 0;
      const w = playOut(normalIsBlack ? 'normal' : 'easy', normalIsBlack ? 'easy' : 'normal', i + 1);
      if (w === (normalIsBlack ? BLACK : WHITE)) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(7);
  }, 60000);

  it('HARD は NORMAL に勝ち越す', () => {
    let wins = 0;
    for (let i = 0; i < 6; i++) {
      const hardIsBlack = i % 2 === 0;
      const w = playOut(hardIsBlack ? 'hard' : 'normal', hardIsBlack ? 'normal' : 'hard', i + 11);
      if (w === (hardIsBlack ? BLACK : WHITE)) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(4);
  }, 120000);

  it('合法手がなければ -1', () => {
    const b = new Array(64).fill(BLACK) as Board;
    b[0] = EMPTY;
    expect(chooseMove(b, WHITE, 'hard')).toBe(-1);
  });
});
