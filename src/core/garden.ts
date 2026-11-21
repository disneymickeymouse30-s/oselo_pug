/**
 * お庭のロジック（React 非依存）
 * - 家具の配置判定・設置・移動・片づけ
 * - 家具の購入・お庭の拡張・お庭に出すパグの選択
 * - パグの行動（どこへ行って何をするか）
 */
import { FURNITURE_BY_ID, GARDEN_SIZES, sizeIndexOf, pugCapacity, type GardenAction, type SeasonSetting } from '../data/garden';
import type { SaveData } from '../store/save';

export interface PlacedItem { uid: number; id: string; x: number; y: number }

export interface GardenData {
  size: number;
  items: PlacedItem[];
  /** 持っている家具の数（置いているものも含む） */
  owned: Record<string, number>;
  /** お庭に出しているパグ */
  pugs: string[];
  season: SeasonSetting;
  nextUid: number;
}

export function newGarden(): GardenData {
  return {
    size: GARDEN_SIZES[0].size,
    items: [
      { uid: 1, id: 'doghouse', x: 0, y: 0 },
      { uid: 2, id: 'bowl', x: 4, y: 1 },
      { uid: 3, id: 'tree', x: 5, y: 4 },
    ],
    owned: { doghouse: 1, bowl: 1, tree: 1 },
    pugs: ['normal', 'black'],
    season: 'auto',
    nextUid: 4,
  };
}

/** 家具の占有マス */
export function cellsOf(it: { id: string; x: number; y: number }): [number, number][] {
  const f = FURNITURE_BY_ID[it.id];
  const out: [number, number][] = [];
  for (let dy = 0; dy < f.h; dy++) for (let dx = 0; dx < f.w; dx++) out.push([it.x + dx, it.y + dy]);
  return out;
}

/** マスごとの占有状況（uid） */
export function occupancy(g: GardenData, ignoreUid?: number): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of g.items) {
    if (it.uid === ignoreUid || !FURNITURE_BY_ID[it.id]) continue;
    for (const [x, y] of cellsOf(it)) m.set(`${x},${y}`, it.uid);
  }
  return m;
}

export function canPlace(g: GardenData, id: string, x: number, y: number, ignoreUid?: number): boolean {
  const f = FURNITURE_BY_ID[id];
  if (!f) return false;
  if (x < 0 || y < 0 || x + f.w > g.size || y + f.h > g.size) return false;
  const occ = occupancy(g, ignoreUid);
  return cellsOf({ id, x, y }).every(([cx, cy]) => !occ.has(`${cx},${cy}`));
}

export const placedCount = (g: GardenData, id: string) => g.items.filter((i) => i.id === id).length;
export const stockOf = (g: GardenData, id: string) => (g.owned[id] ?? 0) - placedCount(g, id);

export type GardenResult = { ok: true; garden: GardenData } | { ok: false; reason: string };

export function placeItem(g: GardenData, id: string, x: number, y: number): GardenResult {
  if (stockOf(g, id) <= 0) return { ok: false, reason: 'その家具はもう全部置いています' };
  if (!canPlace(g, id, x, y)) return { ok: false, reason: 'そこには置けません' };
  return { ok: true, garden: { ...g, items: [...g.items, { uid: g.nextUid, id, x, y }], nextUid: g.nextUid + 1 } };
}

export function moveItem(g: GardenData, uid: number, x: number, y: number): GardenResult {
  const it = g.items.find((i) => i.uid === uid);
  if (!it) return { ok: false, reason: '家具が見つかりません' };
  if (!canPlace(g, it.id, x, y, uid)) return { ok: false, reason: 'そこには置けません' };
  return { ok: true, garden: { ...g, items: g.items.map((i) => (i.uid === uid ? { ...i, x, y } : i)) } };
}

export function storeItem(g: GardenData, uid: number): GardenData {
  return { ...g, items: g.items.filter((i) => i.uid !== uid) };
}

// ---------------------------------------------------------------
// お店・拡張・パグ
// ---------------------------------------------------------------

export type SaveResult = { ok: true; save: SaveData } | { ok: false; reason: string };

export function buyFurniture(save: SaveData, id: string): SaveResult {
  const f = FURNITURE_BY_ID[id];
  if (!f) return { ok: false, reason: 'その家具はありません' };
  if (save.player.lv < f.reqLv) return { ok: false, reason: `プレイヤー Lv.${f.reqLv} になると買えます` };
  if (f.unique && (save.garden.owned[id] ?? 0) > 0) return { ok: false, reason: 'これは1つしか持てません' };
  if (save.wallet.coins < f.coins) return { ok: false, reason: 'コインが足りません' };
  const g = save.garden;
  return {
    ok: true,
    save: {
      ...save,
      wallet: { ...save.wallet, coins: save.wallet.coins - f.coins },
      garden: { ...g, owned: { ...g.owned, [id]: (g.owned[id] ?? 0) + 1 } },
    },
  };
}

export function expandGarden(save: SaveData): SaveResult {
  const i = sizeIndexOf(save.garden.size);
  const next = GARDEN_SIZES[i + 1];
  if (!next) return { ok: false, reason: 'これ以上ひろげられません' };
  if (save.player.lv < next.reqLv) return { ok: false, reason: `プレイヤー Lv.${next.reqLv} になるとひろげられます` };
  if (save.wallet.coins < next.coins) return { ok: false, reason: 'コインが足りません' };
  // 家具はそのままの位置（左上基準）で広がる
  return {
    ok: true,
    save: { ...save, wallet: { ...save.wallet, coins: save.wallet.coins - next.coins }, garden: { ...save.garden, size: next.size } },
  };
}

export function toggleGardenPug(save: SaveData, id: string): SaveResult {
  const g = save.garden;
  if (!save.pugs[id]) return { ok: false, reason: 'まだ仲間になっていないパグです' };
  if (g.pugs.includes(id)) return { ok: true, save: { ...save, garden: { ...g, pugs: g.pugs.filter((p) => p !== id) } } };
  if (g.pugs.length >= pugCapacity(g.size)) return { ok: false, reason: `このお庭には ${pugCapacity(g.size)} 匹まで。お庭をひろげると増やせます` };
  return { ok: true, save: { ...save, garden: { ...g, pugs: [...g.pugs, id] } } };
}

/** 読み込んだお庭データを安全な形にそろえる（範囲外・重なり・持っていない家具は片づける） */
export function normalizeGarden(raw: unknown, ownedPugs: Record<string, unknown>): GardenData {
  const base = newGarden();
  if (!raw || typeof raw !== 'object') {
    return { ...base, pugs: base.pugs.filter((p) => ownedPugs[p]) };
  }
  const r = raw as Partial<GardenData>;
  const size = GARDEN_SIZES.some((s) => s.size === r.size) ? r.size! : base.size;
  const owned: Record<string, number> = {};
  for (const [id, n] of Object.entries(r.owned ?? {})) {
    if (FURNITURE_BY_ID[id] && typeof n === 'number' && n > 0) owned[id] = Math.min(FURNITURE_BY_ID[id].unique ? 1 : 99, Math.floor(n));
  }
  let g: GardenData = { size, items: [], owned, pugs: [], season: base.season, nextUid: 1 };
  let uid = 1;
  for (const it of Array.isArray(r.items) ? r.items : []) {
    if (!it || !FURNITURE_BY_ID[it.id] || !Number.isInteger(it.x) || !Number.isInteger(it.y)) continue;
    if (stockOf(g, it.id) <= 0 || !canPlace(g, it.id, it.x, it.y)) continue;
    g = { ...g, items: [...g.items, { uid: uid++, id: it.id, x: it.x, y: it.y }] };
  }
  const seasons: SeasonSetting[] = ['auto', 'spring', 'summer', 'autumn', 'winter'];
  return {
    ...g,
    nextUid: uid,
    pugs: [...new Set((Array.isArray(r.pugs) ? r.pugs : []).filter((p) => typeof p === 'string' && ownedPugs[p]))].slice(0, pugCapacity(size)),
    season: seasons.includes(r.season as SeasonSetting) ? (r.season as SeasonSetting) : 'auto',
  };
}

// ---------------------------------------------------------------
// パグの行動
// ---------------------------------------------------------------

export type PugPose = 'stand' | 'walk' | 'sleep' | 'eat' | 'play' | 'sit' | 'bath';

export interface PugPlan {
  /** 目的地（マス座標・小数可。パグの足元の中心） */
  x: number;
  y: number;
  /** 着いたあとにとるポーズ */
  pose: PugPose;
  /** そこで過ごす時間（ミリ秒） */
  stay: number;
  /** 向かう家具（なければ null） */
  target: number | null;
}

const ACTION_POSE: Record<Exclude<GardenAction, null>, PugPose> = {
  sleep: 'sleep', eat: 'eat', play: 'play', sit: 'sit', bath: 'bath', look: 'sit',
};

/** 家具のどこで行動するか（足元の中心座標） */
export function actionSpot(it: PlacedItem): { x: number; y: number } {
  const f = FURNITURE_BY_ID[it.id];
  switch (f.action) {
    case 'eat':
      // お皿の右どなり／カフェの前
      return f.w === 1 ? { x: it.x + 1.5, y: it.y + 0.7 } : { x: it.x + f.w / 2, y: it.y + f.h + 0.3 };
    case 'look':
      return { x: it.x + f.w / 2, y: it.y + f.h + 0.4 };
    case 'sleep':
      return f.w === 1 ? { x: it.x + 0.5, y: it.y + 0.75 } : { x: it.x + f.w / 2, y: it.y + f.h - 0.15 };
    default:
      return { x: it.x + f.w / 2, y: it.y + f.h * 0.65 };
  }
}

/** 次の行動を決める。rnd は 0〜1 の乱数（テストで差しかえ可能） */
export function nextPlan(g: GardenData, rnd: () => number = Math.random): PugPlan {
  const interactive = g.items.filter((i) => FURNITURE_BY_ID[i.id]?.action);
  if (interactive.length && rnd() < 0.55) {
    const it = interactive[Math.floor(rnd() * interactive.length)];
    const f = FURNITURE_BY_ID[it.id];
    const spot = actionSpot(it);
    const clamp = (v: number) => Math.min(g.size - 0.3, Math.max(0.3, v));
    const pose = ACTION_POSE[f.action!];
    const stay = pose === 'sleep' ? 7000 + rnd() * 6000 : 3500 + rnd() * 3000;
    // 何匹かが同じ家具に集まっても重なりすぎないよう、少しずらす
    const jitter = (rnd() - 0.5) * Math.min(0.8, f.w * 0.4);
    return { x: clamp(spot.x + jitter), y: clamp(spot.y), pose, stay, target: it.uid };
  }
  // 空いているマスへおさんぽ
  const occ = occupancy(g);
  const free: [number, number][] = [];
  for (let y = 0; y < g.size; y++) for (let x = 0; x < g.size; x++) if (!occ.has(`${x},${y}`)) free.push([x, y]);
  const [fx, fy] = free.length ? free[Math.floor(rnd() * free.length)] : [g.size / 2, g.size / 2];
  return { x: fx + 0.5, y: fy + 0.7, pose: rnd() < 0.3 ? 'sit' : 'stand', stay: 1500 + rnd() * 2500, target: null };
}
