import { writeFileSync } from 'node:fs';
/**
 * 詰めオセロ盤面の生成スクリプト（通常のテストには含めない）
 *   cp scripts/gen-puzzles.ts tests/zz-gen.test.ts && npx vitest run tests/zz-gen.test.ts（結果は /tmp/puzzles.json）
 * ランダムに進めた局面を完全読みし、「最善手なら勝てるが、間違えると負ける手もある」局面を選ぶ。
 */
import { it } from 'vitest';
import { initialBoard, legalMoves, applyMove, opponent, countPieces, getFlips, BLACK, WHITE, EMPTY, type Board, type Player } from '../src/core/othello';

function solve(b: Board, p: Player, passed = false, alpha = -99, beta = 99): number {
  const moves = legalMoves(b, p);
  if (!moves.length) {
    if (passed) { const c = countPieces(b); return p === BLACK ? c.black - c.white : c.white - c.black; }
    return -solve(b, opponent(p), true, -beta, -alpha);
  }
  let best = -99;
  for (const m of moves) {
    const v = -solve(applyMove(b, m, p)!.board, opponent(p), false, -beta, -alpha);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

const str = (b: Board) => Array.from({ length: 8 }, (_, r) => b.slice(r * 8, r * 8 + 8).map((c) => (c === BLACK ? 'B' : c === WHITE ? 'W' : '.')).join(''));

it('generate', () => {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const specs = [
    { name: 'p1', empties: 8, kind: 'normal' }, { name: 'p2', empties: 9, kind: 'normal' }, { name: 'p3', empties: 10, kind: 'normal' },
    { name: 'p4', empties: 10, kind: 'normal' }, { name: 'p5', empties: 11, kind: 'normal' }, { name: 'p6', empties: 11, kind: 'normal' },
    { name: 'p7', empties: 12, kind: 'normal' },
    { name: 'comeback1', empties: 12, kind: 'comeback' }, { name: 'comeback2', empties: 12, kind: 'comeback' },
    { name: 'bigflip', empties: 10, kind: 'bigflip' },
  ];
  const out: Record<string, unknown> = {};
  for (const sp of specs) {
    for (let tries = 0; tries < 4000; tries++) {
      let b = initialBoard();
      let p: Player = BLACK;
      while (countPieces(b).empty > sp.empties) {
        const ms = legalMoves(b, p);
        if (!ms.length) { if (!legalMoves(b, opponent(p)).length) break; p = opponent(p); continue; }
        b = applyMove(b, ms[Math.floor(rnd() * ms.length)], p)!.board;
        p = opponent(p);
      }
      const c = countPieces(b);
      if (c.empty !== sp.empties) continue;
      const ms = legalMoves(b, p);
      if (ms.length < 3) continue;
      const lead = p === BLACK ? c.black - c.white : c.white - c.black;
      if (sp.kind === 'comeback' && lead > -10) continue;
      const scores = ms.map((m) => ({ m, s: -solve(applyMove(b, m, p)!.board, opponent(p)), f: getFlips(b, m, p).length }));
      const wins = scores.filter((x) => x.s > 0);
      if (!wins.length || wins.length > ms.length / 2) continue;
      if (sp.kind === 'bigflip' && !wins.some((x) => x.f >= 8)) continue;
      out[sp.name] = { board: str(b), turn: p === BLACK ? 'B' : 'W', moves: ms.length, winning: wins.length, best: Math.max(...wins.map((w) => w.s)), lead };
      break;
    }
  }
  writeFileSync('/tmp/puzzles.json', JSON.stringify(out, null, 1));
}, 600000);
