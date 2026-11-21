import { describe, it, expect } from 'vitest';
import { PUGS, RARITIES } from '../src/data/pugs';
import { BOARDS, BACKGROUNDS, HAT_SOURCES, ACC_SOURCES, ownedHats } from '../src/data/items';
import { HATS, ACCS } from '../src/components/parts';
import { COATS } from '../src/components/PugFace';
import { emptyStats, describe as describeCond, isMet } from '../src/data/conditions';
import { recordGame, applyResult, unlockAll, type GameResult } from '../src/core/progress';
import { newSave, migrate, exportJSON, importJSON, SAVE_VERSION } from '../src/store/save';
import { BLACK, WHITE } from '../src/core/othello';

const win = (over: Partial<GameResult> = {}): GameResult => ({
  mode: '1p', level: 'normal', human: BLACK, black: 40, white: 24,
  humanCorners: 1, humanWorstLead: -2, endedAt: new Date('2026-11-21T12:00:00'), ...over,
});

describe('パグ図鑑データ', () => {
  it('50種類以上・id と図鑑番号が重複しない', () => {
    expect(PUGS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(PUGS.map((p) => p.id)).size).toBe(PUGS.length);
    expect(PUGS.map((p) => p.no)).toEqual(PUGS.map((_, i) => i + 1));
  });

  it('全レアリティがそろっている', () => {
    for (const r of RARITIES) expect(PUGS.some((p) => p.rarity === r)).toBe(true);
  });

  it('毛色・帽子・アクセサリーは定義済みのものだけを使う', () => {
    for (const p of PUGS) {
      expect(COATS[p.coat]).toBeDefined();
      if (p.hat) expect(HATS[p.hat]).toBeDefined();
      if (p.acc) expect(ACCS[p.acc]).toBeDefined();
      expect(p.desc.length).toBeGreaterThan(5);
      expect(describeCond(p.unlock).length).toBeGreaterThan(0);
    }
  });

  it('すべての帽子・アクセサリーに入手元のパグがいる', () => {
    for (const h of Object.keys(HATS)) expect(HAT_SOURCES[h as keyof typeof HATS].length).toBeGreaterThan(0);
    for (const a of Object.keys(ACCS)) expect(ACC_SOURCES[a as keyof typeof ACCS].length).toBeGreaterThan(0);
  });

  it('「n種類集める」の条件はコンプリート可能な数になっている', () => {
    for (const p of PUGS) if (p.unlock.t === 'collect') expect(p.unlock.n).toBeLessThan(PUGS.length);
  });

  it('盤面・背景は最初から1つずつ使える', () => {
    expect(BOARDS.filter((b) => b.unlock.t === 'start')).toHaveLength(1);
    expect(BACKGROUNDS.filter((b) => b.unlock.t === 'start')).toHaveLength(1);
  });
});

describe('対局記録と解放', () => {
  it('新規データでは最初の仲間と初期アイテムだけ解放される', () => {
    const { save, unlocked } = unlockAll(newSave(), new Date());
    expect(unlocked.pugs.sort()).toEqual(['black', 'normal']);
    expect(unlocked.boards).toEqual(['grass']);
    expect(unlocked.bgs).toEqual(['cream']);
    expect(Object.keys(save.pugs)).toHaveLength(2);
  });

  it('勝利・連勝・大差・白番・逆転を正しく数える', () => {
    let s = emptyStats();
    s = applyResult(s, win());
    s = applyResult(s, win({ human: WHITE, black: 10, white: 54, humanWorstLead: -12 }));
    expect(s).toMatchObject({ games: 2, wins: 2, streak: 2, bestStreak: 2, bestMargin: 44, winsAsWhite: 1, comebacks: 1 });
    s = applyResult(s, win({ black: 20, white: 44 }));
    expect(s).toMatchObject({ losses: 1, streak: 0, bestStreak: 2 });
    s = applyResult(s, win({ black: 32, white: 32 }));
    expect(s.draws).toBe(1);
  });

  it('ふたりであそぶは勝敗に数えず、対局数とふたり対局数に入る', () => {
    const s = applyResult(emptyStats(), win({ mode: '2p' }));
    expect(s).toMatchObject({ games: 1, duoGames: 1, wins: 0, losses: 0 });
  });

  it('1回目の勝利でリボンパグが手に入り、同じパグは二重に手に入らない', () => {
    let { save } = unlockAll(newSave(), new Date());
    const r1 = recordGame(save, win());
    expect(r1.unlocked.pugs).toContain('ribbon');
    expect(r1.unlocked.pugs).toContain('white');
    save = r1.save;
    const r2 = recordGame(save, win({ black: 33, white: 31 }));
    expect(r2.unlocked.pugs).not.toContain('ribbon');
    expect(r2.unlocked.pugs).toContain('bowtie');
  });

  it('パーフェクト勝利で天使パグ、HARD 勝利で忍者パグ', () => {
    const { save } = unlockAll(newSave(), new Date());
    const r = recordGame(save, win({ level: 'hard', black: 64, white: 0, humanCorners: 4 }));
    expect(r.unlocked.pugs).toEqual(expect.arrayContaining(['angel', 'ninja', 'corner', 'galaxy', 'star', 'space', 'gentleman']));
  });

  it('季節限定は該当月に対局すると手に入る', () => {
    const { save } = unlockAll(newSave(), new Date());
    const r = recordGame(save, win({ endedAt: new Date('2026-12-24T20:00:00') }));
    expect(r.unlocked.pugs).toContain('santa');
    expect(r.unlocked.pugs).not.toContain('sakura');
  });

  it('全条件を満たすと全52種コンプリートでき、伝説のパグマスターも連鎖で手に入る', () => {
    const s = { ...newSave(), stats: {
      ...emptyStats(), games: 200, wins: 100, winsByLevel: { easy: 0, normal: 0, hard: 60 }, duoGames: 10,
      bestStreak: 20, bestMargin: 64, perfects: 1, corners4Wins: 1, winsAsWhite: 20, comebacks: 1, draws: 1,
      months: [], playedAtNight: true,
    } };
    const r = unlockAll(s, new Date());
    expect(Object.keys(r.save.pugs)).toHaveLength(PUGS.length);
    expect(r.save.pugs.master).toBeDefined();
    expect(ownedHats(new Set(Object.keys(r.save.pugs))).size).toBe(Object.keys(HATS).length);
  });

  it('条件判定：HARD の勝ちは NORMAL 以上の勝ちにも数える', () => {
    const s = { ...emptyStats(), winsByLevel: { easy: 0, normal: 0, hard: 1 } };
    expect(isMet({ t: 'winsLv', lv: 'normal', n: 1 }, s, 0)).toBe(true);
    expect(isMet({ t: 'winsLv', lv: 'hard', n: 2 }, s, 0)).toBe(false);
  });
});

describe('セーブデータ', () => {
  it('バージョン番号がつく', () => {
    expect(newSave().version).toBe(SAVE_VERSION);
  });

  it('壊れたデータ・空データは新規データになる', () => {
    expect(migrate(null).version).toBe(SAVE_VERSION);
    expect(migrate('abc').pugs).toEqual({});
  });

  it('バージョンなしの古いデータでも足りない項目を補って読み込める', () => {
    const d = migrate({ stats: { wins: 3 }, pugs: { normal: { at: '2026-01-01T00:00:00Z', seen: true }, unknown: { at: 'x', seen: true } } });
    expect(d.stats.wins).toBe(3);
    expect(d.stats.winsByLevel).toEqual({ easy: 0, normal: 0, hard: 0 });
    expect(Object.keys(d.pugs)).toEqual(['normal']); // 存在しないキャラは捨てる
    expect(d.outfit.board).toBe('grass');
  });

  it('不正な着せ替え値は初期値に戻す', () => {
    const d = migrate({ version: 1, outfit: { black: { hat: 'nope', acc: 'bowtie' }, board: 'xxx' } });
    expect(d.outfit.black).toEqual({ hat: null, acc: 'bowtie' });
    expect(d.outfit.board).toBe('grass');
  });

  it('新しいバージョンのデータは読み込みを拒否する', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow();
  });

  it('JSON エクスポート → インポートで元に戻る', () => {
    const { save } = recordGame(unlockAll(newSave(), new Date()).save, win());
    expect(importJSON(exportJSON(save))).toEqual(save);
    expect(() => importJSON('{"foo":1}')).toThrow();
  });
});
