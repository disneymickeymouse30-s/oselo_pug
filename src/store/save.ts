/**
 * セーブデータ
 * - バージョン番号つき。構造を変えたら SAVE_VERSION を上げて MIGRATIONS に変換処理を足す
 * - IndexedDB に保存（使えない環境では localStorage に自動で切り替え）
 * - JSON でのエクスポート／インポートに対応（バックアップ画面は第7段階）
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyStats, type PlayStats } from '../data/conditions';
import type { HatId, AccId } from '../components/parts';
import { HATS, ACCS } from '../components/parts';
import { BOARD_BY_ID, BG_BY_ID, MARKERS, EFFECTS } from '../data/items';
import { PUG_BY_ID } from '../data/pugs';
import { PUG_MAX_LV, PLAYER_MAX_LV, LOVE_MAX } from '../data/growth';
import { newGarden, normalizeGarden, type GardenData } from '../core/garden';
import { newMissions, newLogin, type MissionState, type LoginState } from '../core/modes';
import { STAGE_BY_ID } from '../data/challenges';
import { CUP_BY_ID } from '../data/cups';
import { ACH_BY_ID, TITLE_BY_ID, FRAME_BY_ID } from '../data/achievements';
import type { GameLog } from '../core/achievements';

export const SAVE_VERSION = 5;

export interface Owned {
  /** 入手日時（ISO 8601） */
  at: string;
  /** 図鑑・着せ替えで一度見たか（NEW 表示用） */
  seen: boolean;
}

export interface PieceOutfit {
  hat: HatId | null;
  acc: AccId | null;
}

export interface Outfit {
  black: PieceOutfit;
  white: PieceOutfit;
  board: string;
  bg: string;
  /** 置ける場所の目印（カーソル） */
  marker: string;
  /** 勝ったときの演出 */
  effect: string;
}

export interface FavoriteOutfit extends Outfit {
  name: string;
}

export interface PugGrowth {
  lv: number;
  exp: number;
  /** 親密度 0〜100 */
  love: number;
  /** 最後になでた日（YYYY-MM-DD） */
  lastPet: string | null;
}

export interface Wallet {
  coins: number;
  /** パグポイント */
  pp: number;
  /** 累計獲得（戦績用） */
  earnedCoins: number;
  earnedPP: number;
}

export interface SaveData {
  version: number;
  createdAt: string;
  playerName: string;
  player: { lv: number; exp: number };
  wallet: Wallet;
  /** パグごとの育成状態（入手済みのパグのみ） */
  growth: Record<string, PugGrowth>;
  /** これまでに記録した最新の日付（日付の巻き戻しによる報酬の再取得を防ぐ） */
  lastSeenDay: string;
  /** お庭（第4段階） */
  garden: GardenData;
  /** 第5段階：チャレンジの成績（星・クリア回数） */
  challenge: Record<string, { stars: number; clears: number }>;
  /** 第5段階：大会の成績と、進行中の大会 */
  cups: Record<string, { wins: number; tries: number }>;
  cupRun: { cupId: string; round: number } | null;
  missions: MissionState;
  login: LoginState;
  /** 第6段階：実績（解除日時・報酬受け取り済みか）、称号、プロフィールフレーム、対局履歴 */
  achievements: Record<string, { at: string; claimed: boolean }>;
  title: string | null;
  frame: string;
  history: GameLog[];
  stats: PlayStats;
  pugs: Record<string, Owned>;
  boards: Record<string, Owned>;
  bgs: Record<string, Owned>;
  outfit: Outfit;
  /** お気に入りの組み合わせ（4枠） */
  favorites: (FavoriteOutfit | null)[];
  /** パートナー（お気に入り）のパグ。ホームに表示され、対局で経験値をもらう */
  favoritePug: string;
}

export const DEFAULT_NAME = 'パグマスター';
export const newGrowth = (): PugGrowth => ({ lv: 1, exp: 0, love: 0, lastPet: null });

/** 端末のローカル日付 YYYY-MM-DD */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const FAVORITE_SLOTS = 4;

export const defaultOutfit = (): Outfit => ({
  black: { hat: null, acc: null },
  white: { hat: null, acc: null },
  board: 'grass',
  bg: 'cream',
  marker: 'paw',
  effect: 'confetti',
});

export function newSave(now = new Date()): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: now.toISOString(),
    playerName: DEFAULT_NAME,
    player: { lv: 1, exp: 0 },
    wallet: { coins: 0, pp: 0, earnedCoins: 0, earnedPP: 0 },
    growth: {},
    lastSeenDay: '',
    garden: newGarden(),
    challenge: {},
    cups: {},
    cupRun: null,
    missions: newMissions(),
    login: newLogin(),
    achievements: {},
    title: null,
    frame: 'basic',
    history: [],
    stats: emptyStats(),
    pugs: {},
    boards: {},
    bgs: {},
    outfit: defaultOutfit(),
    favorites: Array(FAVORITE_SLOTS).fill(null),
    favoritePug: 'normal',
  };
}

/** バージョン n → n+1 の変換。例：MIGRATIONS[1] = (d) => ({ ...d, version: 2, newField: ... }) */
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 → v2：育成・通貨・プレイヤーレベルを追加。持っているパグは Lv1 から育て始める
  1: (d) => ({
    ...d,
    version: 2,
    playerName: DEFAULT_NAME,
    player: { lv: 1, exp: 0 },
    wallet: { coins: 0, pp: 0, earnedCoins: 0, earnedPP: 0 },
    growth: Object.fromEntries(Object.keys((d.pugs ?? {}) as object).map((id) => [id, newGrowth()])),
    lastSeenDay: '',
  }),
  // v2 → v3：お庭を追加（犬小屋・ごはん皿・木つきの小さなお庭からスタート）
  2: (d) => ({ ...d, version: 3, garden: newGarden() }),
  // v3 → v4：チャレンジ・大会・ミッション・ログインボーナスを追加
  3: (d) => ({ ...d, version: 4, challenge: {}, cups: {}, cupRun: null, missions: newMissions(), login: newLogin() }),
  // v4 → v5：実績・称号・プロフィールフレーム・対局履歴を追加（これまでの記録から実績は起動時に自動解除）
  4: (d) => ({ ...d, version: 5, achievements: {}, title: null, frame: 'basic', history: [] }),
};

/**
 * 読み込んだデータを現在の形にそろえる。
 * 古いバージョンは順番に変換し、足りない項目は初期値で補う。壊れたデータなら新規作成。
 */
export function migrate(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return newSave();
  let d = raw as Record<string, unknown>;
  let v = typeof d.version === 'number' ? d.version : 0;
  if (v > SAVE_VERSION) throw new Error('このセーブデータは新しいバージョンのゲームで作られています');
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    d = step ? step(d) : { ...d, version: v + 1 };
    v++;
  }
  const base = newSave();
  const s = d as Partial<SaveData>;
  const stats = {
    ...base.stats, ...(s.stats ?? {}),
    winsByLevel: { ...base.stats.winsByLevel, ...(s.stats?.winsByLevel ?? {}) },
    gamesByLevel: { ...base.stats.gamesByLevel, ...(s.stats?.gamesByLevel ?? {}) },
  };
  const pickOwned = (rec: unknown, valid: (id: string) => boolean) =>
    Object.fromEntries(Object.entries((rec ?? {}) as Record<string, Owned>).filter(([id, o]) => valid(id) && o && typeof o.at === 'string'));
  const cleanPiece = (p?: Partial<PieceOutfit>): PieceOutfit => ({
    hat: p?.hat && p.hat in HATS ? p.hat : null,
    acc: p?.acc && p.acc in ACCS ? p.acc : null,
  });
  const cleanOutfit = (o?: Partial<Outfit>): Outfit => ({
    black: cleanPiece(o?.black),
    white: cleanPiece(o?.white),
    board: o?.board && BOARD_BY_ID[o.board] ? o.board : 'grass',
    bg: o?.bg && BG_BY_ID[o.bg] ? o.bg : 'cream',
    marker: o?.marker && MARKERS.some((m) => m.id === o.marker) ? o.marker : 'paw',
    effect: o?.effect && EFFECTS.some((e) => e.id === o.effect) ? o.effect : 'confetti',
  });
  const favs = Array.from({ length: FAVORITE_SLOTS }, (_, i) => {
    const f = s.favorites?.[i];
    return f ? { ...cleanOutfit(f), name: String(f.name ?? `セット${i + 1}`).slice(0, 12) } : null;
  });
  const num = (v: unknown, def: number, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : def;
  const pugs = pickOwned(s.pugs, (id) => Boolean(PUG_BY_ID[id]));
  const growth: Record<string, PugGrowth> = {};
  for (const id of Object.keys(pugs)) {
    const g = (s.growth?.[id] ?? {}) as Partial<PugGrowth>;
    growth[id] = {
      lv: num(g.lv, 1, 1, PUG_MAX_LV),
      exp: num(g.exp, 0),
      love: num(g.love, 0, 0, LOVE_MAX),
      lastPet: typeof g.lastPet === 'string' ? g.lastPet : null,
    };
  }
  const w = (s.wallet ?? {}) as Partial<Wallet>;
  return {
    version: SAVE_VERSION,
    createdAt: typeof s.createdAt === 'string' ? s.createdAt : base.createdAt,
    playerName: typeof s.playerName === 'string' && s.playerName.trim() ? s.playerName.slice(0, 12) : DEFAULT_NAME,
    player: { lv: num(s.player?.lv, 1, 1, PLAYER_MAX_LV), exp: num(s.player?.exp, 0) },
    wallet: { coins: num(w.coins, 0), pp: num(w.pp, 0), earnedCoins: num(w.earnedCoins, 0), earnedPP: num(w.earnedPP, 0) },
    growth,
    lastSeenDay: typeof s.lastSeenDay === 'string' ? s.lastSeenDay : '',
    garden: normalizeGarden(s.garden, pugs),
    challenge: Object.fromEntries(Object.entries(s.challenge ?? {})
      .filter(([id, c]) => STAGE_BY_ID[id] && c && typeof c === 'object')
      .map(([id, c]) => [id, { stars: num(c.stars, 0, 0, 3), clears: num(c.clears, 0) }])),
    cups: Object.fromEntries(Object.entries(s.cups ?? {})
      .filter(([id, c]) => CUP_BY_ID[id] && c && typeof c === 'object')
      .map(([id, c]) => [id, { wins: num(c.wins, 0), tries: num(c.tries, 0) }])),
    cupRun: s.cupRun && CUP_BY_ID[s.cupRun.cupId] && Number.isInteger(s.cupRun.round) && s.cupRun.round >= 0 && s.cupRun.round < CUP_BY_ID[s.cupRun.cupId].matches.length
      ? { cupId: s.cupRun.cupId, round: s.cupRun.round } : null,
    missions: { ...newMissions(), ...(s.missions ?? {}) },
    login: { ...newLogin(), ...(s.login ?? {}) },
    achievements: Object.fromEntries(Object.entries(s.achievements ?? {})
      .filter(([id, a]) => ACH_BY_ID[id] && a && typeof a.at === 'string')
      .map(([id, a]) => [id, { at: a.at, claimed: Boolean(a.claimed) }])),
    title: s.title && TITLE_BY_ID[s.title] ? s.title : null,
    frame: s.frame && FRAME_BY_ID[s.frame] ? s.frame : 'basic',
    history: (Array.isArray(s.history) ? s.history : [])
      .filter((g) => g && typeof g.t === 'string' && (g.m === '1p' || g.m === '2p') && ['w', 'l', 'd'].includes(g.r))
      .slice(-300),
    stats,
    pugs,
    boards: pickOwned(s.boards, (id) => Boolean(BOARD_BY_ID[id])),
    bgs: pickOwned(s.bgs, (id) => Boolean(BG_BY_ID[id])),
    outfit: cleanOutfit(s.outfit),
    favorites: favs,
    favoritePug: s.favoritePug && PUG_BY_ID[s.favoritePug] ? s.favoritePug : 'normal',
  };
}

export function exportJSON(save: SaveData): string {
  return JSON.stringify({ app: 'pug-reversi', exportedAt: new Date().toISOString(), data: save }, null, 2);
}

export function importJSON(text: string): SaveData {
  const parsed = JSON.parse(text);
  if (parsed?.app !== 'pug-reversi' || !parsed.data) throw new Error('PUG REVERSI のバックアップファイルではありません');
  return migrate(parsed.data);
}

// ---------------------------------------------------------------
// 保存先（IndexedDB → localStorage フォールバック）
// ---------------------------------------------------------------

const DB_NAME = 'pug-reversi';
const STORE = 'kv';
const KEY = 'save';
const LS_KEY = 'pug-reversi:save';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB の汎用読み書き（セーブデータ・自動バックアップで共有） */
export async function idbGet(key: string = KEY): Promise<unknown> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(value: unknown, key: string = KEY): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** すべてのデータを消す（初期化） */
export async function wipeAll(): Promise<void> {
  try { await idbDelete(KEY); await idbDelete('autoBackups'); } catch { /* なし */ }
  try { localStorage.removeItem(LS_KEY); localStorage.removeItem('pug-reversi:settings:v1'); } catch { /* なし */ }
}

export async function loadSave(): Promise<SaveData> {
  try {
    const v = await idbGet();
    if (v) return migrate(v);
  } catch { /* IndexedDB が使えない */ }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch { /* 読めない */ }
  return newSave();
}

export async function writeSave(save: SaveData): Promise<void> {
  try {
    await idbSet(save);
    return;
  } catch { /* フォールバック */ }
  try { localStorage.setItem(LS_KEY, JSON.stringify(save)); } catch { /* 保存できない環境 */ }
}

/** セーブデータを読み込み、変更のたびに保存するフック */
export function useSave(init: (s: SaveData) => SaveData) {
  const [save, setSave] = useState<SaveData | null>(null);
  const initRef = useRef(init);
  useEffect(() => {
    let alive = true;
    loadSave().then((s) => { if (alive) setSave(initRef.current(s)); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (save) void writeSave(save); }, [save]);
  const update = useCallback((fn: (s: SaveData) => SaveData) => setSave((s) => (s ? fn(s) : s)), []);
  return [save, update] as const;
}
