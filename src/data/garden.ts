/**
 * お庭のデータ（家具・広さ・季節）
 * 家具を増やすときはここに1行足し、GardenSprites.tsx に絵を1つ足す。
 */

/** パグがその家具でとる行動 */
export type GardenAction = 'sleep' | 'eat' | 'play' | 'sit' | 'bath' | 'look' | null;

export interface Furniture {
  id: string;
  name: string;
  /** 占有するマス（横・縦） */
  w: number;
  h: number;
  /** 絵の高さ（マス単位。h より大きいと上に伸びる） */
  spriteH: number;
  coins: number;
  /** 必要なプレイヤーレベル */
  reqLv: number;
  action: GardenAction;
  /** 1つしか持てない */
  unique?: boolean;
  desc: string;
}

// prettier-ignore
export const FURNITURE: Furniture[] = [
  { id: 'doghouse',   name: '犬小屋',         w: 2, h: 2, spriteH: 2.5, coins: 300,  reqLv: 1,  action: 'sleep', desc: '赤い屋根のおうち。中でぐっすり眠れる。' },
  { id: 'bed',        name: 'パグ用ベッド',   w: 1, h: 1, spriteH: 1,   coins: 120,  reqLv: 1,  action: 'sleep', desc: 'ふかふかのクッション。お昼寝に最適。' },
  { id: 'bowl',       name: 'ごはん皿',       w: 1, h: 1, spriteH: 0.8, coins: 50,   reqLv: 1,  action: 'eat',   desc: 'いつでもごはんが入っている、ふしぎなお皿。' },
  { id: 'bone',       name: '骨のおもちゃ',   w: 1, h: 1, spriteH: 0.8, coins: 60,   reqLv: 1,  action: 'play',  desc: 'かじってもかじってもなくならない。' },
  { id: 'tree',       name: '木',             w: 1, h: 1, spriteH: 2.4, coins: 100,  reqLv: 1,  action: null,    desc: '季節で色が変わる木。' },
  { id: 'flower',     name: '花壇',           w: 2, h: 1, spriteH: 1.3, coins: 80,   reqLv: 1,  action: null,    desc: 'いろとりどりの花。' },
  { id: 'bench',      name: 'ベンチ',         w: 2, h: 1, spriteH: 1.4, coins: 150,  reqLv: 2,  action: 'sit',   desc: 'ひなたぼっこの特等席。' },
  { id: 'lamp',       name: '街灯',           w: 1, h: 1, spriteH: 2.4, coins: 120,  reqLv: 3,  action: null,    desc: '夜になるとやさしく光る。' },
  { id: 'fountain',   name: '噴水',           w: 2, h: 2, spriteH: 2.2, coins: 600,  reqLv: 4,  action: 'look',  desc: '水しぶきを見ているだけで楽しい。' },
  { id: 'xmastree',   name: 'クリスマスツリー', w: 1, h: 1, spriteH: 2.8, coins: 500, reqLv: 5,  action: 'look',  desc: '冬になるとライトがきらきら光る。', unique: true },
  { id: 'pool',       name: 'プール',         w: 2, h: 2, spriteH: 1.2, coins: 800,  reqLv: 6,  action: 'bath',  desc: 'ぱしゃぱしゃ犬かき。' },
  { id: 'playground', name: 'すべり台',       w: 2, h: 2, spriteH: 2.4, coins: 900,  reqLv: 8,  action: 'play',  desc: 'のぼって、すべって、またのぼる。' },
  { id: 'cafe',       name: 'ドッグカフェ',   w: 3, h: 2, spriteH: 2.8, coins: 1500, reqLv: 10, action: 'eat',   desc: 'パグ用スイーツが自慢のカフェ。', unique: true },
  { id: 'onsen',      name: '温泉',           w: 3, h: 2, spriteH: 1.6, coins: 2000, reqLv: 12, action: 'bath',  desc: 'ごくらく、ごくらく。', unique: true },
  { id: 'tower',      name: '展望台',         w: 2, h: 2, spriteH: 3.6, coins: 3000, reqLv: 15, action: 'look',  desc: 'お庭全体が見わたせる。', unique: true },
  { id: 'castle',     name: 'お城',           w: 3, h: 3, spriteH: 4.2, coins: 6000, reqLv: 20, action: 'sleep', desc: 'パグの王様が住むお城。', unique: true },
];
export const FURNITURE_BY_ID: Record<string, Furniture> = Object.fromEntries(FURNITURE.map((f) => [f.id, f]));

/** お庭の広さ（段階ごと） */
export interface GardenSize { size: number; coins: number; reqLv: number; pugs: number; name: string }
export const GARDEN_SIZES: GardenSize[] = [
  { size: 6, coins: 0, reqLv: 1, pugs: 3, name: 'ちいさなお庭' },
  { size: 8, coins: 600, reqLv: 5, pugs: 5, name: 'ふつうのお庭' },
  { size: 10, coins: 2500, reqLv: 12, pugs: 8, name: 'ひろいお庭' },
];
export const sizeIndexOf = (size: number) => Math.max(0, GARDEN_SIZES.findIndex((s) => s.size === size));
export const pugCapacity = (size: number) => GARDEN_SIZES[sizeIndexOf(size)].pugs;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SeasonSetting = Season | 'auto';
export const SEASONS: { id: Season; name: string }[] = [
  { id: 'spring', name: '春' },
  { id: 'summer', name: '夏' },
  { id: 'autumn', name: '秋' },
  { id: 'winter', name: '冬' },
];
export function seasonOf(d: Date): Season {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}
export const isNight = (d: Date) => d.getHours() >= 18 || d.getHours() < 6;
