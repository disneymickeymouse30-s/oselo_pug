/**
 * 着せ替えアイテム
 * - 帽子・アクセサリー：そのアイテムを身につけたパグを図鑑で入手すると使えるようになる
 * - オセロ盤・背景：それぞれの解放条件を満たすと使えるようになる
 */
import { HATS, ACCS, type HatId, type AccId } from '../components/parts';
import { PUGS } from './pugs';
import type { Condition } from './conditions';

export interface BoardTheme {
  id: string;
  name: string;
  frame: [string, string];
  frameShadow: string;
  cell: string;
  cellAlt: string;
  line: string;
  unlock: Condition;
}

export interface Background {
  id: string;
  name: string;
  css: string;
  unlock: Condition;
}

// prettier-ignore
export const BOARDS: BoardTheme[] = [
  { id: 'grass',  name: '芝生',       frame: ['#8a5a3c', '#5a3a28'], frameShadow: '#3e271a', cell: '#7cbf5e', cellAlt: '#75b958', line: '#3a7d30', unlock: { t: 'start' } },
  { id: 'wood',   name: 'ウッド',     frame: ['#6b4a2a', '#4a2f18'], frameShadow: '#2e1c0e', cell: '#e2b877', cellAlt: '#dbb06e', line: '#a97a3f', unlock: { t: 'games', n: 5 } },
  { id: 'sakura', name: 'さくら',     frame: ['#e88aa4', '#c76784'], frameShadow: '#99475f', cell: '#ffd4df', cellAlt: '#ffcbd8', line: '#e89ab0', unlock: { t: 'wins', n: 10 } },
  { id: 'ocean',  name: 'オーシャン', frame: ['#3f7fbf', '#2a5d94'], frameShadow: '#1b3f68', cell: '#8fd0f0', cellAlt: '#86c9ea', line: '#4f9bc8', unlock: { t: 'games', n: 25 } },
  { id: 'night',  name: 'ミッドナイト', frame: ['#3a3a5a', '#22223a'], frameShadow: '#121222', cell: '#3f5a7a', cellAlt: '#3a5372', line: '#22324a', unlock: { t: 'winsLv', lv: 'hard', n: 1 } },
  { id: 'gold',   name: 'ゴールド',   frame: ['#f2c94c', '#b98a12'], frameShadow: '#7a5a08', cell: '#7cbf5e', cellAlt: '#75b958', line: '#c99a2a', unlock: { t: 'collect', n: 30 } },
];

// prettier-ignore
export const BACKGROUNDS: Background[] = [
  { id: 'cream', name: 'クリーム',   css: 'radial-gradient(circle at 15px 15px, rgba(201,154,107,.12) 3px, transparent 4px) 0 0 / 46px 46px, #fff8ec', unlock: { t: 'start' } },
  { id: 'field', name: 'はらっぱ',   css: 'linear-gradient(#e8f7d8, #cfeab4)', unlock: { t: 'games', n: 3 } },
  { id: 'sky',   name: 'あおぞら',   css: 'radial-gradient(ellipse 60px 22px at 20% 18%, #fff 60%, transparent 62%), radial-gradient(ellipse 80px 26px at 80% 32%, #fff 60%, transparent 62%), linear-gradient(#bfe6ff, #f2fbff)', unlock: { t: 'wins', n: 5 } },
  { id: 'beach', name: 'ビーチ',     css: 'linear-gradient(#bfe9ff 0%, #e8f8ff 55%, #f8e3b4 56%, #f3d49a 100%)', unlock: { t: 'games', n: 20 } },
  { id: 'stars', name: '星空',       css: 'radial-gradient(circle at 20% 30%, #fff 1px, transparent 2px) 0 0 / 60px 60px, radial-gradient(circle at 70% 70%, #ffe9a8 1px, transparent 2px) 0 0 / 80px 80px, linear-gradient(#2b2d5e, #4a3f7a)', unlock: { t: 'winsLv', lv: 'normal', n: 5 } },
  { id: 'onsen', name: '温泉',       css: 'radial-gradient(circle at 30px 30px, rgba(255,255,255,.5) 6px, transparent 7px) 0 0 / 70px 70px, linear-gradient(#f9e4d4, #e9cdb9)', unlock: { t: 'collect', n: 15 } },
];

export const BOARD_BY_ID: Record<string, BoardTheme> = Object.fromEntries(BOARDS.map((b) => [b.id, b]));
export const BG_BY_ID: Record<string, Background> = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b]));

/** 帽子・アクセサリーを身につけているパグ（どのパグで手に入るか） */
export const HAT_SOURCES: Record<HatId, string[]> = Object.fromEntries(
  (Object.keys(HATS) as HatId[]).map((h) => [h, PUGS.filter((p) => p.hat === h).map((p) => p.id)]),
) as Record<HatId, string[]>;
export const ACC_SOURCES: Record<AccId, string[]> = Object.fromEntries(
  (Object.keys(ACCS) as AccId[]).map((a) => [a, PUGS.filter((p) => p.acc === a).map((p) => p.id)]),
) as Record<AccId, string[]>;

export function ownedHats(ownedPugs: Set<string>): Set<HatId> {
  return new Set((Object.keys(HAT_SOURCES) as HatId[]).filter((h) => HAT_SOURCES[h].some((id) => ownedPugs.has(id))));
}
export function ownedAccs(ownedPugs: Set<string>): Set<AccId> {
  return new Set((Object.keys(ACC_SOURCES) as AccId[]).filter((a) => ACC_SOURCES[a].some((id) => ownedPugs.has(id))));
}

/** 盤面テーマを CSS 変数にする（.app や プレビューにそのまま渡す） */
export function boardVars(id: string): Record<string, string> {
  const b = BOARD_BY_ID[id] ?? BOARDS[0];
  return {
    '--frame-1': b.frame[0],
    '--frame-2': b.frame[1],
    '--frame-shadow': b.frameShadow,
    '--cell': b.cell,
    '--cell-alt': b.cellAlt,
    '--cell-line': b.line,
  };
}

// ---------------- カーソル（置ける場所の目印）と勝利演出（第8段階） ----------------

export interface Marker { id: 'paw' | 'bone' | 'heart' | 'star'; name: string; unlock: Condition }
export const MARKERS: Marker[] = [
  { id: 'paw', name: '肉球', unlock: { t: 'start' } },
  { id: 'bone', name: 'ほね', unlock: { t: 'games', n: 10 } },
  { id: 'heart', name: 'ハート', unlock: { t: 'wins', n: 20 } },
  { id: 'star', name: 'スター', unlock: { t: 'winsLv', lv: 'hard', n: 3 } },
];

export interface VictoryEffect { id: 'confetti' | 'hearts' | 'stars' | 'paws' | 'fireworks'; name: string; chars: string[]; unlock: Condition }
export const EFFECTS: VictoryEffect[] = [
  { id: 'confetti', name: '紙ふぶき', chars: ['■', '●', '▲'], unlock: { t: 'start' } },
  { id: 'paws', name: '肉球の雨', chars: ['🐾'], unlock: { t: 'wins', n: 5 } },
  { id: 'hearts', name: 'ハートいっぱい', chars: ['💗', '💖', '💕'], unlock: { t: 'collect', n: 15 } },
  { id: 'stars', name: 'きらきら星', chars: ['⭐', '✨', '🌟'], unlock: { t: 'streak', n: 5 } },
  { id: 'fireworks', name: '花火', chars: ['🎆', '🎇', '✨'], unlock: { t: 'winsLv', lv: 'hard', n: 10 } },
];
