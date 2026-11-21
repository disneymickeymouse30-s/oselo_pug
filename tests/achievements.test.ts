import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, TITLES, FRAMES, TITLE_BY_ID, FRAME_BY_ID } from '../src/data/achievements';
import {
  checkAchievements, claimAchievement, claimAllAchievements, metricValue, ownedTitles, ownedFrames, summarize, winRateTrend,
  HISTORY_MAX, type GameLog,
} from '../src/core/achievements';
import { recordGame, unlockAll, petPug, type GameResult } from '../src/core/progress';
import { newSave, migrate, SAVE_VERSION, type SaveData } from '../src/store/save';
import { BLACK, WHITE } from '../src/core/othello';
import { PUGS } from '../src/data/pugs';

const NOW = new Date('2026-11-10T12:00:00');
const start = (): SaveData => unlockAll(newSave(NOW), NOW).save;
const game = (o: Partial<GameResult> = {}): GameResult => ({
  mode: '1p', level: 'normal', human: BLACK, black: 40, white: 24, humanCorners: 1, humanWorstLead: 0, endedAt: NOW, durationMs: 120000, ...o,
});

describe('実績データ', () => {
  it('100種類以上・id が重複しない・称号とフレームは定義済み', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      if (a.title) expect(TITLE_BY_ID[a.title]).toBeDefined();
      if (a.frame) expect(FRAME_BY_ID[a.frame]).toBeDefined();
    }
  });

  it('すべての称号・フレームに入手方法がある', () => {
    for (const t of TITLES) expect(ACHIEVEMENTS.some((a) => a.title === t.id), t.name).toBe(true);
    for (const f of FRAMES.filter((x) => x.id !== 'basic')) expect(ACHIEVEMENTS.some((a) => a.frame === f.id), f.name).toBe(true);
  });

  it('仕様の例（初勝利・10勝・50勝・100勝・10連勝・HARD撃破・チャレンジ制覇・図鑑50%/100%・全背景・全大会）がある', () => {
    const names = ACHIEVEMENTS.map((a) => a.name);
    for (const n of ['初勝利', '10勝', '50勝', '100勝', '10連勝', 'HARD CPU 撃破', 'チャレンジ制覇', '図鑑 50%', '図鑑 100%', '全背景解放', '全大会優勝']) {
      expect(names).toContain(n);
    }
    const tnames = TITLES.map((t) => t.name);
    for (const n of ['パグ見習い', '肉球名人', 'オセロ王', 'パグ大王', '伝説のパグマスター']) expect(tnames).toContain(n);
  });
});

describe('実績の解除と受け取り', () => {
  it('初勝利で「はじめての対局」「初勝利」が解除され、称号が使える', () => {
    const { save } = checkAchievements(recordGame(start(), game()).save, NOW);
    expect(save.achievements['games-1']).toBeDefined();
    expect(save.achievements['wins-1']).toBeDefined();
    expect(ownedTitles(save).map((t) => t.id)).toEqual(expect.arrayContaining(['minarai', 'first-win']));
    expect(ownedFrames(save).map((f) => f.id)).toEqual(['basic']);
  });

  it('報酬は1回だけ受け取れる', () => {
    const { save } = checkAchievements(recordGame(start(), game()).save, NOW);
    const r = claimAchievement(save, 'wins-1');
    if (!r.ok) throw new Error(r.reason);
    expect(r.save.wallet.coins).toBe(save.wallet.coins + r.coins);
    expect(claimAchievement(r.save, 'wins-1').ok).toBe(false);
    expect(claimAchievement(r.save, 'wins-500').ok).toBe(false); // 未解除
  });

  it('まとめて受け取れる', () => {
    const { save } = checkAchievements(recordGame(start(), game()).save, NOW);
    const all = claimAllAchievements(save);
    expect(all.count).toBe(Object.keys(save.achievements).length);
    expect(Object.values(all.save.achievements).every((a) => a.claimed)).toBe(true);
    expect(claimAllAchievements(all.save).count).toBe(0);
  });

  it('同じ実績は二度解除されない', () => {
    const a = checkAchievements(recordGame(start(), game()).save, NOW);
    const b = checkAchievements(a.save, NOW);
    expect(b.newly).toEqual([]);
  });

  it('図鑑の完成率で実績が解除される（全員集めると100%）', () => {
    const s = start();
    const all = { ...s, pugs: Object.fromEntries(PUGS.map((p) => [p.id, { at: NOW.toISOString(), seen: true }])) };
    expect(metricValue(all, 'zukanPct')).toBe(100);
    const r = checkAchievements(all, NOW);
    expect(r.newly).toEqual(expect.arrayContaining(['zukanPct-50', 'zukanPct-100', 'legendPugs-4', 'hats-30']));
  });

  it('なでた回数が数えられる', () => {
    const r = petPug(start(), 'normal', NOW);
    expect(r.ok && metricValue(r.save, 'pets') === 1).toBe(true);
  });
});

describe('戦績の集計', () => {
  it('勝ち・負け・引き分け・勝率・難易度別・平均時間・平均駒数', () => {
    let s = start();
    s = recordGame(s, game({ level: 'easy', durationMs: 60000 })).save;            // 勝ち 40
    s = recordGame(s, game({ level: 'hard', black: 20, white: 44, durationMs: 180000 })).save; // 負け 20
    s = recordGame(s, game({ level: 'hard', human: WHITE, black: 30, white: 34 })).save;       // 勝ち 34
    s = recordGame(s, game({ black: 32, white: 32 })).save;                         // 引き分け 32
    s = recordGame(s, game({ mode: '2p' })).save;                                   // 2人対戦
    const sum = summarize(s);
    expect(sum).toMatchObject({ games: 5, wins: 2, losses: 1, draws: 1, winRate: 50, bestStreak: 1 });
    expect(sum.byLevel.find((l) => l.level === 'hard')).toEqual({ level: 'hard', games: 2, wins: 1, rate: 50 });
    expect(sum.avgDiscs).toBe(31.5); // (40+20+34+32)/4
    expect(sum.avgSec).toBe(Math.round((60 + 180 + 120 + 120 + 120) / 5));
    expect(s.history).toHaveLength(5);
    expect(s.history.map((h) => h.r)).toEqual(['w', 'l', 'w', 'd', 'w']);
  });

  it('対局履歴は上限までで古いものから消える', () => {
    let s = start();
    for (let i = 0; i < HISTORY_MAX + 5; i++) s = recordGame(s, game()).save;
    expect(s.history).toHaveLength(HISTORY_MAX);
  });

  it('勝率の推移は直近10局の移動平均', () => {
    const logs: GameLog[] = Array.from({ length: 12 }, (_, i) => ({ t: '', m: '1p', l: 'easy', r: i < 6 ? 'l' : 'w', my: 0, op: 0, sec: 0 }));
    const tr = winRateTrend(logs);
    expect(tr[0].rate).toBe(0);
    expect(tr[9].rate).toBe(40);
    expect(tr[11].rate).toBe(60);
  });
});

describe('セーブ v5', () => {
  it('第5段階（v4）のデータを引き継ぎ、これまでの記録から実績が解除される', () => {
    const d = migrate({ version: 4, stats: { games: 60, wins: 55 }, pugs: { normal: { at: 'x', seen: true } } });
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.achievements).toEqual({});
    expect(d.frame).toBe('basic');
    const r = checkAchievements(d, NOW);
    expect(r.newly).toEqual(expect.arrayContaining(['games-50', 'wins-50']));
  });

  it('不正な実績・称号・履歴は捨てる', () => {
    const d = migrate({ version: 5, achievements: { 'wins-1': { at: 'x', claimed: 1 }, nope: { at: 'x' } }, title: 'zzz', frame: 'zzz', history: [{ t: 'x', m: '1p', r: 'w' }, { foo: 1 }] });
    expect(d.achievements).toEqual({ 'wins-1': { at: 'x', claimed: true } });
    expect(d.title).toBeNull();
    expect(d.frame).toBe('basic');
    expect(d.history).toHaveLength(1);
  });
});
