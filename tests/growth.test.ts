import { describe, it, expect } from 'vitest';
import {
  recordGame, unlockAll, gainPlayerExp, gainPugExp, computeRewards, petPug, feedPug, buyPug, buyItem, canPet,
  type GameResult,
} from '../src/core/progress';
import { newSave, migrate, newGrowth, SAVE_VERSION, type SaveData } from '../src/store/save';
import { playerExpToNext, pugExpToNext, PUG_MAX_LV, LOVE_MAX, REWARDS, LEVELUP_PP, PROFILES } from '../src/data/growth';
import { PUGS } from '../src/data/pugs';
import { BLACK } from '../src/core/othello';

const NOW = new Date('2026-11-10T12:00:00'); // イベント期間外
const game = (over: Partial<GameResult> = {}): GameResult => ({
  mode: '1p', level: 'normal', human: BLACK, black: 40, white: 24,
  humanCorners: 1, humanWorstLead: -2, endedAt: NOW, ...over,
});
const start = (): SaveData => unlockAll(newSave(NOW), NOW).save;
const rich = (s: SaveData, coins = 10000, pp = 1000): SaveData => ({ ...s, wallet: { ...s.wallet, coins, pp } });

describe('経験値とレベル', () => {
  it('プレイヤーは必要経験値ちょうどで1つ上がり、余りは持ち越す', () => {
    expect(gainPlayerExp({ lv: 1, exp: 0 }, playerExpToNext(1))).toEqual({ player: { lv: 2, exp: 0 }, levelUps: 1 });
    const r = gainPlayerExp({ lv: 1, exp: 0 }, playerExpToNext(1) + playerExpToNext(2) + 7);
    expect(r).toEqual({ player: { lv: 3, exp: 7 }, levelUps: 2 });
  });

  it('パグは最大レベルで止まり、親密度は上限を超えない', () => {
    const r = gainPugExp({ ...newGrowth(), lv: PUG_MAX_LV - 1, love: 98 }, 999999, 10);
    expect(r.growth).toMatchObject({ lv: PUG_MAX_LV, exp: 0, love: LOVE_MAX });
    expect(r.levelUps).toBe(1);
    expect(pugExpToNext(1)).toBeGreaterThan(0);
  });
});

describe('対局の報酬', () => {
  it('難易度が高いほど勝利報酬が多い', () => {
    const e = computeRewards(game({ level: 'easy' }));
    const n = computeRewards(game({ level: 'normal' }));
    const h = computeRewards(game({ level: 'hard' }));
    expect(e.coins).toBeLessThan(n.coins);
    expect(n.coins).toBeLessThan(h.coins);
    expect(h.pp).toBeGreaterThan(0);
  });

  it('負けても少しもらえる・パーフェクトと角4つはボーナス', () => {
    expect(computeRewards(game({ black: 10, white: 54 })).coins).toBe(REWARDS.lose.normal.coins);
    const p = computeRewards(game({ black: 64, white: 0, humanCorners: 4 }));
    expect(p.coins).toBeGreaterThan(REWARDS.win.normal.coins + 50);
    expect(p.notes).toEqual(expect.arrayContaining(['パーフェクト', '角4つ']));
  });

  it('記録するとコイン・経験値・パートナーの経験値と親密度が増える', () => {
    const { save, rewards } = recordGame(start(), game());
    expect(save.wallet.coins).toBe(REWARDS.win.normal.coins);
    expect(save.player.exp).toBe(REWARDS.win.normal.exp);
    expect(save.growth.normal.exp).toBe(REWARDS.win.normal.exp);
    expect(save.growth.normal.love).toBeGreaterThan(0);
    expect(rewards.partner.id).toBe('normal');
  });

  it('プレイヤーのレベルアップでパグポイントをもらう', () => {
    const s = { ...start(), player: { lv: 1, exp: playerExpToNext(1) - 1 } };
    const { save, rewards } = recordGame(s, game());
    expect(save.player.lv).toBe(2);
    expect(rewards.pp).toBe(LEVELUP_PP);
    expect(save.wallet.earnedPP).toBe(LEVELUP_PP);
  });

  it('新しく仲間になったパグにも育成データが作られる', () => {
    const { save } = recordGame(start(), game());
    for (const id of Object.keys(save.pugs)) expect(save.growth[id]).toEqual(expect.objectContaining({ lv: expect.any(Number) }));
  });
});

describe('なでる・おやつ・お店', () => {
  it('なでるは1日1回、次の日はまたなでられる', () => {
    const r1 = petPug(start(), 'normal', NOW);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(petPug(r1.save, 'normal', NOW).ok).toBe(false);
    expect(petPug(r1.save, 'normal', new Date('2026-11-22T08:00:00')).ok).toBe(true);
  });

  it('端末の日付を過去に戻しても、もう一度なでることはできない', () => {
    const r1 = petPug(start(), 'normal', new Date('2026-11-21T10:00:00'));
    if (!r1.ok) throw new Error();
    const r2 = petPug(r1.save, 'normal', new Date('2026-11-22T10:00:00'));
    if (!r2.ok) throw new Error();
    expect(canPet(r2.save, 'normal', new Date('2026-11-21T10:00:00'))).toBe(false);
    expect(petPug(r2.save, 'black', new Date('2026-11-20T10:00:00')).ok).toBe(true); // 別のパグは大丈夫
  });

  it('おやつはコインを使って経験値をあげる。足りなければ何も変わらない', () => {
    const s = start();
    expect(feedPug(s, 'normal', 'sasami')).toEqual({ ok: false, reason: 'コインが足りません' });
    const r = feedPug(rich(s, 50), 'normal', 'sasami');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.save.wallet.coins).toBe(0);
      expect(r.save.growth.normal.exp + r.save.growth.normal.lv).toBeGreaterThan(1);
    }
  });

  it('レベルも親密度も最大ならおやつは不要', () => {
    const s = rich(start());
    s.growth.normal = { lv: PUG_MAX_LV, exp: 0, love: LOVE_MAX, lastPet: null };
    expect(feedPug(s, 'normal', 'sasami').ok).toBe(false);
  });

  it('パグポイントで N・R のパグを迎えられる。SR 以上は買えない', () => {
    const r = buyPug(rich(start(), 0, 100), 'white', NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.save.pugs.white).toBeDefined();
      expect(r.save.wallet.pp).toBe(90);
      expect(buyPug(r.save, 'white', NOW).ok).toBe(false); // 二重購入不可
    }
    expect(buyPug(rich(start()), 'ninja', NOW).ok).toBe(false);
  });

  it('コインで盤面・背景を解放できる。持っているものは買えない', () => {
    const r = buyItem(rich(start(), 200), 'board', 'wood', NOW);
    expect(r.ok && r.save.boards.wood && r.save.wallet.coins === 0).toBeTruthy();
    expect(buyItem(rich(start()), 'board', 'grass', NOW).ok).toBe(false);
    expect(buyItem(rich(start(), 10), 'bg', 'stars', NOW).ok).toBe(false);
  });
});

describe('データとマイグレーション', () => {
  it('全パグに専用プロフィールがある', () => {
    for (const p of PUGS) expect(PROFILES[p.id]).toHaveLength(3);
  });

  it('第2段階（v1）のデータを読み込むと、持っているパグが Lv1 から育てられる', () => {
    const v1 = { version: 1, pugs: { normal: { at: '2026-11-01T00:00:00Z', seen: true }, ninja: { at: '2026-11-02T00:00:00Z', seen: true } }, stats: { wins: 9 } };
    const d = migrate(v1);
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.growth).toEqual({ normal: newGrowth(), ninja: newGrowth() });
    expect(d.wallet.coins).toBe(0);
    expect(d.player).toEqual({ lv: 1, exp: 0 });
    expect(d.stats.wins).toBe(9);
  });

  it('不正な数値（マイナス・巨大値・文字列）は安全な値に直す', () => {
    const d = migrate({ version: 2, wallet: { coins: -5, pp: 'x' }, pugs: { normal: { at: 'x', seen: true } }, growth: { normal: { lv: 999, love: 500 } } });
    expect(d.wallet).toMatchObject({ coins: 0, pp: 0 });
    expect(d.growth.normal).toMatchObject({ lv: PUG_MAX_LV, love: LOVE_MAX });
  });
});
