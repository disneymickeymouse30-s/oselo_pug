import { describe, it, expect } from 'vitest';
import {
  newGarden, canPlace, placeItem, moveItem, storeItem, stockOf, buyFurniture, expandGarden, toggleGardenPug,
  normalizeGarden, nextPlan, actionSpot, occupancy, type GardenData,
} from '../src/core/garden';
import { FURNITURE, FURNITURE_BY_ID, GARDEN_SIZES, seasonOf } from '../src/data/garden';
import { newSave, migrate, SAVE_VERSION, type SaveData } from '../src/store/save';
import { unlockAll } from '../src/core/progress';

const NOW = new Date('2026-11-21T12:00:00');
const start = (): SaveData => unlockAll(newSave(NOW), NOW).save;
const withMoney = (s: SaveData, coins: number, lv = 30): SaveData => ({ ...s, wallet: { ...s.wallet, coins }, player: { lv, exp: 0 } });

describe('家具データ', () => {
  it('仕様の家具がそろっている（犬小屋・温泉・カフェ・花壇・噴水・ベンチ・プール・遊具・骨・ベッド・ツリー・お城・展望台）', () => {
    for (const id of ['doghouse', 'onsen', 'cafe', 'flower', 'fountain', 'bench', 'pool', 'playground', 'bone', 'bed', 'xmastree', 'castle', 'tower']) {
      expect(FURNITURE_BY_ID[id]).toBeDefined();
    }
    expect(new Set(FURNITURE.map((f) => f.id)).size).toBe(FURNITURE.length);
  });

  it('すべての家具は一番ひろいお庭に置ける大きさ', () => {
    const max = GARDEN_SIZES.at(-1)!.size;
    for (const f of FURNITURE) expect(f.w <= max && f.h <= max).toBe(true);
  });
});

describe('配置', () => {
  it('はじめのお庭は家具が重ならずに置かれている', () => {
    const g = newGarden();
    const cells = g.items.reduce((n, it) => n + FURNITURE_BY_ID[it.id].w * FURNITURE_BY_ID[it.id].h, 0);
    expect(occupancy(g).size).toBe(cells);
  });

  it('範囲外・重なりには置けない', () => {
    const g = newGarden(); // 犬小屋が (0,0)〜(1,1)
    expect(canPlace(g, 'bench', 1, 0)).toBe(false); // 犬小屋と重なる
    expect(canPlace(g, 'bench', 5, 3)).toBe(false); // はみ出す
    expect(canPlace(g, 'bench', 2, 3)).toBe(true);
  });

  it('持っている数までしか置けず、しまうとまた置ける', () => {
    let g: GardenData = { ...newGarden(), owned: { ...newGarden().owned, bed: 1 } };
    const r1 = placeItem(g, 'bed', 2, 3);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    g = r1.garden;
    expect(stockOf(g, 'bed')).toBe(0);
    expect(placeItem(g, 'bed', 3, 3).ok).toBe(false);
    const bedUid = g.items.find((i) => i.id === 'bed')!.uid;
    g = storeItem(g, bedUid);
    expect(stockOf(g, 'bed')).toBe(1);
  });

  it('移動は自分自身との重なりを無視する', () => {
    const g = newGarden();
    const house = g.items.find((i) => i.id === 'doghouse')!;
    expect(moveItem(g, house.uid, 1, 0).ok).toBe(true); // 1マス右にずらす（元の位置と重なるが OK）
    expect(moveItem(g, house.uid, 4, 0).ok).toBe(false); // ごはん皿と重なる
  });
});

describe('お店・拡張・パグ', () => {
  it('コインとレベルが足りれば家具を買える', () => {
    expect(buyFurniture(withMoney(start(), 0), 'bed').ok).toBe(false);
    expect(buyFurniture(withMoney(start(), 9999, 1), 'castle')).toEqual({ ok: false, reason: 'プレイヤー Lv.20 になると買えます' });
    const r = buyFurniture(withMoney(start(), 200), 'bed');
    expect(r.ok && r.save.garden.owned.bed === 1 && r.save.wallet.coins === 80).toBeTruthy();
  });

  it('1つしか持てない家具は2つ目を買えない', () => {
    const r = buyFurniture(withMoney(start(), 99999), 'castle');
    if (!r.ok) throw new Error(r.reason);
    expect(buyFurniture(r.save, 'castle').ok).toBe(false);
  });

  it('お庭は段階的にひろがり、出せるパグも増える', () => {
    let s = withMoney(start(), 99999);
    for (const next of GARDEN_SIZES.slice(1)) {
      const r = expandGarden(s);
      if (!r.ok) throw new Error(r.reason);
      s = r.save;
      expect(s.garden.size).toBe(next.size);
    }
    expect(expandGarden(s).ok).toBe(false);
  });

  it('お庭に出せるパグの数には上限がある', () => {
    let s = start();
    s = { ...s, pugs: { ...s.pugs, white: { at: '', seen: true }, apricot: { at: '', seen: true } } };
    let r = toggleGardenPug(s, 'white');
    if (!r.ok) throw new Error();
    s = r.save;
    expect(s.garden.pugs).toHaveLength(3);
    r = toggleGardenPug(s, 'apricot');
    expect(r.ok).toBe(false);
    r = toggleGardenPug(s, 'white'); // もう一度押すと戻す
    expect(r.ok && r.save.garden.pugs.length === 2).toBeTruthy();
  });
});

describe('パグの行動', () => {
  it('行き先はいつもお庭の中で、家具に向かうときはその家具の行動をとる', () => {
    const g = newGarden();
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const poses = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const p = nextPlan(g, rnd);
      expect(p.x).toBeGreaterThan(0);
      expect(p.y).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(g.size);
      expect(p.y).toBeLessThan(g.size);
      expect(p.stay).toBeGreaterThan(0);
      poses.add(p.pose);
    }
    // 犬小屋で寝る・お皿で食べる・おさんぽ がすべて起きる
    expect([...poses]).toEqual(expect.arrayContaining(['sleep', 'eat', 'stand']));
  });

  it('おさんぽの行き先は家具のないマス', () => {
    const g = newGarden();
    const occ = occupancy(g);
    const rnd = (() => { let i = 0; const seq = [0.9, 0.3, 0.5]; return () => seq[i++ % seq.length]; })();
    const p = nextPlan(g, rnd);
    expect(p.target).toBeNull();
    expect(occ.has(`${Math.floor(p.x)},${Math.floor(p.y)}`)).toBe(false);
  });

  it('家具の行動場所はお庭の中', () => {
    for (const f of FURNITURE) {
      const s = actionSpot({ uid: 1, id: f.id, x: 0, y: 0 });
      expect(s.x).toBeGreaterThan(0);
      expect(s.y).toBeGreaterThan(0);
    }
  });
});

describe('季節・セーブ', () => {
  it('月から季節を決める', () => {
    expect(seasonOf(new Date('2026-04-01'))).toBe('spring');
    expect(seasonOf(new Date('2026-08-01'))).toBe('summer');
    expect(seasonOf(new Date('2026-11-21'))).toBe('autumn');
    expect(seasonOf(new Date('2026-01-10'))).toBe('winter');
  });

  it('第3段階（v2）のデータを読み込むと、はじめのお庭が用意される', () => {
    const d = migrate({ version: 2, pugs: { normal: { at: 'x', seen: true } }, wallet: { coins: 300 } });
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.garden.items.length).toBeGreaterThan(0);
    expect(d.garden.pugs).toEqual(['normal']); // 持っていない黒パグは外れる
    expect(d.wallet.coins).toBe(300);
  });

  it('壊れたお庭データ（重なり・範囲外・持っていない家具）は片づける', () => {
    const g = normalizeGarden({
      size: 6,
      owned: { bed: 2, castle: 5, unknown: 3 },
      items: [{ id: 'bed', x: 0, y: 0 }, { id: 'bed', x: 0, y: 0 }, { id: 'castle', x: 5, y: 5 }, { id: 'bed', x: 1, y: 1 }, { id: 'bed', x: 2, y: 2 }],
      pugs: ['normal', 'normal', 'nobody'],
      season: 'rainy',
    }, { normal: {} });
    expect(g.owned).toEqual({ bed: 2, castle: 1 });
    expect(g.items.map((i) => [i.x, i.y])).toEqual([[0, 0], [1, 1]]);
    expect(g.pugs).toEqual(['normal']);
    expect(g.season).toBe('auto');
  });
});
