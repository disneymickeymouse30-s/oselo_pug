import { describe, it, expect } from 'vitest';
import { STAGES, describeObjective } from '../src/data/challenges';
import { CUPS, humanColorFor } from '../src/data/cups';
import { DAILY, WEEKLY, EVENTS, LOGIN_REWARDS } from '../src/data/missions';
import {
  evaluateStage, recordStage, stageUnlocked, combineSeries, startCup, recordCupMatch, cupUnlocked,
  addMissionEvents, claimMission, claimDailyBonus, rollover, weekOf, loginStatus, claimLogin, claimableCount,
  type PlayDetail,
} from '../src/core/modes';
import { recordGame, unlockAll, petPug, type GameResult } from '../src/core/progress';
import { newSave, migrate, SAVE_VERSION, type SaveData } from '../src/store/save';
import { legalMoves, applyMove, opponent, countPieces, getFlips, BLACK, WHITE, type Board, type Player } from '../src/core/othello';

const D = (s: string) => new Date(`${s}T12:00:00`);
const start = (now = D('2026-11-10')): SaveData => unlockAll(newSave(now), now).save;
const detail = (o: Partial<PlayDetail> = {}): PlayDetail => ({
  won: true, margin: 10, humanCorners: 1, humanWorstLead: 0, humanMaxFlip: 3, humanTotalFlips: 20,
  humanMoves: 29, opponentDiscs: 27, usedUndo: false, usedHint: false, ...o,
});
const game = (o: Partial<GameResult> = {}): GameResult => ({
  mode: '1p', level: 'normal', human: BLACK, black: 40, white: 24, humanCorners: 1, humanWorstLead: 0, endedAt: D('2026-11-10'), ...o,
});

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

describe('チャレンジのデータ', () => {
  it('30ステージ以上・番号順・説明つき', () => {
    expect(STAGES.length).toBeGreaterThanOrEqual(30);
    STAGES.forEach((s, i) => {
      expect(s.no).toBe(i + 1);
      for (const o of [...s.clear, s.star2, s.star3]) expect(describeObjective(o).length).toBeGreaterThan(0);
    });
  });

  it('詰めオセロ盤面は、最善を尽くせば★2の条件まで達成できる（完全読みで検証）', () => {
    for (const s of STAGES.filter((x) => x.start)) {
      const { board, turn } = s.start!;
      expect(turn).toBe(s.human);
      expect(legalMoves(board, turn).length).toBeGreaterThan(0);
      const best = solve(board, turn);
      expect(best, s.title).toBeGreaterThan(0);
      for (const o of [...s.clear, s.star2]) if (o.t === 'margin') expect(best, s.title).toBeGreaterThanOrEqual(o.n);
      const c = countPieces(board);
      const lead = turn === BLACK ? c.black - c.white : c.white - c.black;
      if (s.clear.some((o) => o.t === 'comeback')) expect(lead, s.title).toBeLessThanOrEqual(-10);
      if (s.clear.some((o) => o.t === 'bigFlip')) {
        const n = (s.clear.find((o) => o.t === 'bigFlip') as { n: number }).n;
        expect(legalMoves(board, turn).some((m) => getFlips(board, m, turn).length >= n)).toBe(true);
      }
    }
  }, 120000);

  it('仕様の例（角2つ・30手以内・逆転・連続3ステージ・特定の盤面）がある', () => {
    const all = STAGES.flatMap((s) => s.clear.map((o) => o.t));
    expect(all).toEqual(expect.arrayContaining(['corners', 'movesWithin', 'comeback', 'bigFlip']));
    expect(STAGES.some((s) => s.series?.length === 3)).toBe(true);
    expect(STAGES.filter((s) => s.start).length).toBeGreaterThanOrEqual(7);
  });
});

describe('チャレンジの判定と報酬', () => {
  it('星は クリア＋追加条件 で1〜3', () => {
    const s1 = STAGES[0]; // 勝利 / 10個差 / 1手戻すなし
    expect(evaluateStage(s1, detail({ won: false })).stars).toBe(0);
    expect(evaluateStage(s1, detail({ margin: 4, usedUndo: true })).stars).toBe(1);
    expect(evaluateStage(s1, detail({ margin: 12, usedUndo: true })).stars).toBe(2);
    expect(evaluateStage(s1, detail({ margin: 12 })).stars).toBe(3);
  });

  it('次のステージは前のステージをクリアすると遊べる', () => {
    let s = start();
    expect(stageUnlocked(s, STAGES[1])).toBe(false);
    s = recordStage(s, STAGES[0].id, detail(), D('2026-11-10')).save;
    expect(stageUnlocked(s, STAGES[1])).toBe(true);
  });

  it('初クリアの報酬は1回だけ。星が増えたときだけ PP がもらえる', () => {
    let s = start();
    const r1 = recordStage(s, 's01', detail({ margin: 4, usedUndo: true }), D('2026-11-10'));
    expect(r1.outcome).toMatchObject({ cleared: true, stars: 1, firstClear: true, pp: 1 });
    expect(r1.outcome.coins).toBeGreaterThan(0);
    s = r1.save;
    const r2 = recordStage(s, 's01', detail({ margin: 4, usedUndo: true }), D('2026-11-10'));
    expect(r2.outcome).toMatchObject({ firstClear: false, coins: 0, pp: 0 });
    const r3 = recordStage(r2.save, 's01', detail({ margin: 20 }), D('2026-11-10'));
    expect(r3.outcome.pp).toBe(2);
    expect(r3.save.challenge.s01).toEqual({ stars: 3, clears: 3 });
  });

  it('連戦は全勝でクリア、1回でもヒントを使えば「ヒントなし」は達成できない', () => {
    const c = combineSeries([detail(), detail({ usedHint: true }), detail()]);
    expect(c.won).toBe(true);
    expect(c.usedHint).toBe(true);
    expect(combineSeries([detail(), detail({ won: false })]).won).toBe(false);
  });
});

describe('パグカップ', () => {
  it('6大会・最初の大会以外は前の大会の優勝が条件', () => {
    expect(CUPS.length).toBe(6);
    const s = { ...start(), player: { lv: 99, exp: 0 } };
    expect(cupUnlocked(s, CUPS[0])).toBe(true);
    expect(cupUnlocked(s, CUPS[1])).toBe(false);
  });

  it('全勝で優勝・報酬、負けたら敗退、引き分けはやり直し', () => {
    let s = start();
    const st = startCup(s, 'first', D('2026-11-10'));
    if (!st.ok) throw new Error(st.reason);
    s = st.save;
    expect(s.cupRun).toEqual({ cupId: 'first', round: 0 });
    let r = recordCupMatch(s, 'draw', D('2026-11-10'));
    expect(r.outcome.kind).toBe('replay');
    r = recordCupMatch(r.save, 'win', D('2026-11-10'));
    r = recordCupMatch(r.save, 'win', D('2026-11-10'));
    const coins = r.save.wallet.coins;
    r = recordCupMatch(r.save, 'win', D('2026-11-10'));
    expect(r.outcome.kind).toBe('champion');
    expect(r.save.cupRun).toBeNull();
    expect(r.save.cups.first.wins).toBe(1);
    expect(r.save.wallet.coins).toBe(coins + CUPS[0].coins);
    // 2回目の大会：途中でやめると敗退
    const st2 = startCup(r.save, 'first', D('2026-11-10'));
    if (!st2.ok) throw new Error();
    const f = recordCupMatch(st2.save, 'forfeit', D('2026-11-10'));
    expect(f.outcome.kind).toBe('eliminated');
    expect(f.save.cups.first).toEqual({ wins: 1, tries: 2 });
  });

  it('大会の途中で別の大会には出られない', () => {
    const s = { ...start(), player: { lv: 99, exp: 0 }, cups: { first: { wins: 1, tries: 1 } } };
    const st = startCup(s, 'first', D('2026-11-10'));
    if (!st.ok) throw new Error();
    expect(startCup(st.save, 'green', D('2026-11-10')).ok).toBe(false);
  });

  it('交互の大会は黒白を入れかえる', () => {
    expect([0, 1, 2].map((i) => humanColorFor(CUPS[1], i))).toEqual([BLACK, WHITE, BLACK]);
    expect(humanColorFor(CUPS[3], 0)).toBe(WHITE);
  });
});

describe('ミッション', () => {
  it('仕様のデイリー・ウィークリーがある', () => {
    expect(DAILY.map((m) => m.label)).toEqual(expect.arrayContaining(['1回対局する', '1回勝利する', '角を獲得する', 'CPU に挑戦する']));
    expect(WEEKLY.map((m) => m.label)).toEqual(expect.arrayContaining(['10回対局する', '5回勝利する', 'チャレンジを5つクリア']));
  });

  it('対局でデイリー・ウィークリーが進み、受け取りは1回だけ', () => {
    let s = recordGame(start(), game()).save;
    expect(s.missions.daily['d-win']).toBe(1);
    expect(s.missions.weekly['w-game']).toBe(1);
    const c1 = claimMission(s, 'daily', 'd-win', D('2026-11-10'));
    if (!c1.ok) throw new Error(c1.reason);
    s = c1.save;
    expect(claimMission(s, 'daily', 'd-win', D('2026-11-10'))).toEqual({ ok: false, reason: 'もう受け取りました' });
    expect(claimMission(s, 'daily', 'd-pet', D('2026-11-10')).ok).toBe(false); // 未達成
  });

  it('なでるでデイリーが進む', () => {
    const r = petPug(start(), 'normal', D('2026-11-10'));
    expect(r.ok && r.save.missions.daily['d-pet'] === 1).toBe(true);
  });

  it('日付が変わるとデイリーがリセット。日付を戻してもリセットされず、受け取り済みも残る', () => {
    let s = recordGame(start(), game()).save;
    const c = claimMission(s, 'daily', 'd-game', D('2026-11-10'));
    if (!c.ok) throw new Error();
    s = rollover(c.save, D('2026-11-11'));
    expect(s.missions.daily).toEqual({});
    s = recordGame(s, game({ endedAt: D('2026-11-11') })).save;
    const back = rollover(s, D('2026-11-10')); // 端末の日付を戻す
    expect(back.missions.daily['d-game']).toBe(1);
    const again = claimMission(back, 'daily', 'd-game', D('2026-11-10'));
    expect(again.ok).toBe(true); // 11日分として1回だけ受け取れる
    if (again.ok) expect(claimMission(again.save, 'daily', 'd-game', D('2026-11-09')).ok).toBe(false);
  });

  it('週は月曜はじまりでリセット', () => {
    expect(weekOf('2026-11-21')).toBe('2026-11-16'); // 土曜 → 月曜
    expect(weekOf('2026-11-16')).toBe('2026-11-16');
    let s = recordGame(start(), game()).save;
    s = rollover(s, D('2026-11-15'));
    expect(s.missions.weekly['w-game']).toBe(1);
    s = rollover(s, D('2026-11-16'));
    expect(s.missions.weekly).toEqual({});
  });

  it('デイリーを全部受け取るとボーナス', () => {
    let s = start();
    s = addMissionEvents(s, ['game', 'win', 'corner', 'cpu', 'pet'], D('2026-11-10'));
    expect(claimDailyBonus(s, D('2026-11-10')).ok).toBe(false);
    for (const m of DAILY) { const r = claimMission(s, 'daily', m.id, D('2026-11-10')); if (!r.ok) throw new Error(r.reason); s = r.save; }
    const b = claimDailyBonus(s, D('2026-11-10'));
    expect(b.ok).toBe(true);
    if (b.ok) expect(claimDailyBonus(b.save, D('2026-11-10')).ok).toBe(false);
  });

  it('イベントは期間中だけ進み、コインが増える', () => {
    const ev = EVENTS[0];
    const inside = recordGame(start(D(ev.from)), game({ endedAt: D(ev.from) }));
    const outside = recordGame(start(), game());
    expect(inside.rewards.coins).toBeGreaterThan(outside.rewards.coins);
    expect(inside.save.missions.events[ev.id].progress['e-rel-game']).toBe(1);
    expect(outside.save.missions.events[ev.id]).toBeUndefined();
    expect(claimableCount(inside.save, D(ev.from))).toBeGreaterThan(0);
  });
});

describe('ログインボーナス', () => {
  it('1日1回・連続で日数が進み・7日で1周・1日あくと1日目から', () => {
    let s = start();
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
    const got: number[] = [];
    for (const d of days) {
      const r = claimLogin(s, D(d));
      if (!r.ok) throw new Error(r.reason);
      got.push(r.coins);
      s = r.save;
      expect(claimLogin(s, D(d)).ok).toBe(false);
    }
    expect(got.slice(0, 7)).toEqual(LOGIN_REWARDS.map((x) => x.coins));
    expect(got[7]).toBe(LOGIN_REWARDS[0].coins);
    expect(loginStatus(s, D('2026-11-10'))).toMatchObject({ available: true, dayIndex: 0 }); // 9日をとばした
  });

  it('日付を戻してももう一度受け取れない', () => {
    const r = claimLogin(start(), D('2026-11-10'));
    if (!r.ok) throw new Error();
    expect(claimLogin(r.save, D('2026-11-05')).ok).toBe(false);
  });
});

describe('セーブ v4', () => {
  it('第4段階（v3）のデータを引き継げる', () => {
    const d = migrate({ version: 3, pugs: { normal: { at: 'x', seen: true } }, wallet: { coins: 77 } });
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.challenge).toEqual({});
    expect(d.cupRun).toBeNull();
    expect(d.stats.cupWins).toBe(0);
    expect(d.wallet.coins).toBe(77);
  });

  it('不正なチャレンジ・大会データは捨てる', () => {
    const d = migrate({ version: 4, challenge: { s01: { stars: 9, clears: 2 }, zzz: { stars: 1 } }, cupRun: { cupId: 'first', round: 99 } });
    expect(d.challenge).toEqual({ s01: { stars: 3, clears: 2 } });
    expect(d.cupRun).toBeNull();
  });
});
