/**
 * 実績・称号・プロフィールフレーム（データ駆動）
 * 実績は「指標（metric）が目標（goal）以上になったら解除」。
 * 指標を1つ定義すれば、段階（tier）を並べるだけで実績をいくらでも増やせる。
 */

export type Metric =
  | 'games' | 'wins' | 'winsEasy' | 'winsNormal' | 'winsHard' | 'bestStreak' | 'perfects' | 'corners4' | 'comebacks'
  | 'winsWhite' | 'duo' | 'draws' | 'night' | 'monthsPlayed'
  | 'zukanPct' | 'legendPugs' | 'hats' | 'accs' | 'boards' | 'bgs'
  | 'playerLv' | 'maxPugLv' | 'masterPugs' | 'lovedPugs' | 'pets'
  | 'stagesCleared' | 'stars' | 'cupWins' | 'cupsWon'
  | 'gardenSize' | 'gardenPlaced' | 'furnitureKinds'
  | 'loginDays' | 'earnedCoins' | 'earnedPP' | 'achievements';

export type AchCategory = 'battle' | 'collection' | 'growth' | 'challenge' | 'garden' | 'other';
export const CATEGORIES: { id: AchCategory; name: string; icon: string }[] = [
  { id: 'battle', name: '対局', icon: '⚔️' },
  { id: 'collection', name: 'コレクション', icon: '📖' },
  { id: 'growth', name: '育成', icon: '🦴' },
  { id: 'challenge', name: 'チャレンジ・大会', icon: '🏆' },
  { id: 'garden', name: 'お庭', icon: '🏡' },
  { id: 'other', name: 'その他', icon: '🐾' },
];

export interface Title { id: string; name: string }
// prettier-ignore
export const TITLES: Title[] = [
  { id: 'minarai', name: 'パグ見習い' },
  { id: 'nikukyu', name: '肉球名人' },
  { id: 'othello-king', name: 'オセロ王' },
  { id: 'daiou', name: 'パグ大王' },
  { id: 'legend', name: '伝説のパグマスター' },
  { id: 'first-win', name: 'はじめての勝利' },
  { id: 'streak', name: '連勝街道まっしぐら' },
  { id: 'perfect', name: 'パーフェクトパグ' },
  { id: 'corner', name: '角の番人' },
  { id: 'comeback', name: '逆転の名手' },
  { id: 'gote', name: '後手の達人' },
  { id: 'friends', name: 'なかよしパグ' },
  { id: 'collector', name: 'パグコレクター' },
  { id: 'zukan', name: '図鑑マスター' },
  { id: 'fashion', name: 'おしゃれ番長' },
  { id: 'breeder', name: '育て屋さん' },
  { id: 'love', name: 'パグに愛されし者' },
  { id: 'challenger', name: 'チャレンジャー' },
  { id: 'all-stars', name: '星をつかむ者' },
  { id: 'champion', name: '大会チャンピオン' },
  { id: 'gardener', name: '庭師' },
  { id: 'garden-lord', name: 'お庭の主' },
  { id: 'regular', name: '皆勤賞' },
  { id: 'night-owl', name: '夜ふかしパグ' },
  { id: 'rich', name: 'お金持ちパグ' },
];
export const TITLE_BY_ID: Record<string, Title> = Object.fromEntries(TITLES.map((t) => [t.id, t]));

export interface Frame { id: string; name: string; bg: string; border: string; ink: string }
// prettier-ignore
export const FRAMES: Frame[] = [
  { id: 'basic',   name: 'クリーム',     bg: 'linear-gradient(135deg,#fffaf0,#f7ecd8)', border: '#e2cfb2', ink: '#3d2a1e' },
  { id: 'grass',   name: 'はらっぱ',     bg: 'linear-gradient(135deg,#e8f7d8,#b8e09a)', border: '#7cbf5e', ink: '#2f4f22' },
  { id: 'sakura',  name: 'さくら',       bg: 'linear-gradient(135deg,#fff0f4,#ffc9d8)', border: '#f59bb0', ink: '#6a2a3a' },
  { id: 'ocean',   name: 'オーシャン',   bg: 'linear-gradient(135deg,#e6f6ff,#9fd8f5)', border: '#4fb3e8', ink: '#1c3f5a' },
  { id: 'night',   name: 'ミッドナイト', bg: 'linear-gradient(135deg,#3a3a6a,#1f1f3a)', border: '#8a8ad6', ink: '#f3f0ff' },
  { id: 'gold',    name: 'ゴールド',     bg: 'linear-gradient(135deg,#fff7d0,#f2c94c)', border: '#c99412', ink: '#4a3208' },
  { id: 'rainbow', name: 'レインボー',   bg: 'linear-gradient(135deg,#ffd1e0,#fff3b0,#c9f0ff,#e3d1ff)', border: '#b79cff', ink: '#3d2a4a' },
];
export const FRAME_BY_ID: Record<string, Frame> = Object.fromEntries(FRAMES.map((f) => [f.id, f]));

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  category: AchCategory;
  metric: Metric;
  goal: number;
  coins: number;
  pp: number;
  title?: string;
  frame?: string;
}

type Tier = [goal: number, name: string, extra?: { title?: string; frame?: string; pp?: number }];
interface Group { metric: Metric; category: AchCategory; desc: (n: number) => string; tiers: Tier[]; coinBase: number }

// prettier-ignore
const GROUPS: Group[] = [
  { metric: 'games', category: 'battle', coinBase: 50, desc: (n) => `対局を ${n} 回する`, tiers: [
    [1, 'はじめての対局', { title: 'minarai' }], [10, '対局になれてきた'], [50, 'オセロ好き'], [100, '100局の道'], [300, 'オセロ中毒'], [500, 'オセロの達人への道'], [1000, '千局のパグ'] ] },
  { metric: 'wins', category: 'battle', coinBase: 60, desc: (n) => `CPU に ${n} 勝する`, tiers: [
    [1, '初勝利', { title: 'first-win' }], [10, '10勝'], [50, '50勝', { title: 'nikukyu' }], [100, '100勝', { frame: 'ocean' }], [300, '300勝'], [500, '500勝'] ] },
  { metric: 'winsEasy', category: 'battle', coinBase: 30, desc: (n) => `EASY の CPU に ${n} 勝する`, tiers: [[10, 'のんびりパグの友']] },
  { metric: 'winsNormal', category: 'battle', coinBase: 50, desc: (n) => `NORMAL 以上の CPU に ${n} 勝する`, tiers: [[10, 'かしこいパグに勝つ'], [50, 'NORMAL 卒業']] },
  { metric: 'winsHard', category: 'battle', coinBase: 120, desc: (n) => `HARD の CPU に ${n} 勝する`, tiers: [
    [1, 'HARD CPU 撃破'], [10, '最強パグの好敵手', { frame: 'night' }], [30, 'オセロ王', { title: 'othello-king' }], [100, '最強をこえた者', { pp: 20 }] ] },
  { metric: 'bestStreak', category: 'battle', coinBase: 80, desc: (n) => `CPU に ${n} 連勝する`, tiers: [
    [3, '3連勝'], [5, '5連勝'], [10, '10連勝', { title: 'streak' }], [20, '20連勝', { pp: 10 }] ] },
  { metric: 'perfects', category: 'battle', coinBase: 150, desc: (n) => `パーフェクト勝利を ${n} 回`, tiers: [[1, 'パーフェクト！', { title: 'perfect' }], [5, 'パーフェクトの常連']] },
  { metric: 'corners4', category: 'battle', coinBase: 100, desc: (n) => `角を4つとも取って ${n} 回勝つ`, tiers: [[1, '四つ角制覇'], [10, '角の番人', { title: 'corner' }]] },
  { metric: 'comebacks', category: 'battle', coinBase: 100, desc: (n) => `10個以上の差から ${n} 回逆転勝ち`, tiers: [[1, '大逆転'], [10, '逆転の名手', { title: 'comeback' }]] },
  { metric: 'winsWhite', category: 'battle', coinBase: 60, desc: (n) => `白パグ（後手）で ${n} 勝する`, tiers: [[1, '後手の一勝'], [20, '白パグ使い'], [100, '後手の達人', { title: 'gote' }]] },
  { metric: 'duo', category: 'battle', coinBase: 40, desc: (n) => `ふたりであそぶを ${n} 回`, tiers: [[1, 'いっしょに遊ぼう'], [10, 'なかよし対局'], [50, 'なかよしパグ', { title: 'friends' }]] },
  { metric: 'draws', category: 'battle', coinBase: 80, desc: () => '引き分けになる', tiers: [[1, '32対32']] },
  { metric: 'night', category: 'other', coinBase: 50, desc: () => '22時〜4時に対局する', tiers: [[1, '夜ふかしパグ', { title: 'night-owl' }]] },
  { metric: 'monthsPlayed', category: 'other', coinBase: 300, desc: (n) => `${n} か月それぞれで対局する`, tiers: [[12, '1年中パグといっしょ', { pp: 10 }]] },

  { metric: 'zukanPct', category: 'collection', coinBase: 100, desc: (n) => `図鑑を ${n}% 完成させる`, tiers: [
    [10, '図鑑 10%'], [25, '図鑑 25%', { title: 'collector' }], [50, '図鑑 50%'], [75, '図鑑 75%'], [100, '図鑑 100%', { title: 'zukan', frame: 'rainbow', pp: 20 }] ] },
  { metric: 'legendPugs', category: 'collection', coinBase: 300, desc: (n) => `伝説のパグを ${n} 匹あつめる`, tiers: [[1, '伝説との出会い'], [4, '伝説をすべて']] },
  { metric: 'hats', category: 'collection', coinBase: 80, desc: (n) => `帽子を ${n} 種類あつめる`, tiers: [[10, '帽子コレクター'], [30, '帽子ぜんぶ', { title: 'fashion' }]] },
  { metric: 'accs', category: 'collection', coinBase: 150, desc: (n) => `アクセサリーを ${n} 種類あつめる`, tiers: [[13, 'アクセサリーぜんぶ']] },
  { metric: 'boards', category: 'collection', coinBase: 100, desc: (n) => `オセロ盤を ${n} 種類あつめる`, tiers: [[3, '盤面コレクター'], [6, '全盤面解放']] },
  { metric: 'bgs', category: 'collection', coinBase: 100, desc: (n) => `背景を ${n} 種類あつめる`, tiers: [[3, '背景コレクター', { frame: 'grass' }], [6, '全背景解放']] },

  { metric: 'playerLv', category: 'growth', coinBase: 100, desc: (n) => `プレイヤー Lv.${n} になる`, tiers: [
    [5, 'Lv.5'], [10, 'Lv.10'], [20, 'Lv.20'], [30, 'Lv.30'], [50, 'Lv.50', { pp: 10 }], [99, 'Lv.99', { pp: 30 }] ] },
  { metric: 'maxPugLv', category: 'growth', coinBase: 80, desc: (n) => `パグを Lv.${n} まで育てる`, tiers: [[10, 'すくすく育つ'], [20, 'りっぱなおとな'], [30, 'マスターパグ誕生', { title: 'breeder' }]] },
  { metric: 'masterPugs', category: 'growth', coinBase: 200, desc: (n) => `Lv.30 のパグが ${n} 匹`, tiers: [[3, 'マスター3兄弟'], [10, 'マスターだらけ']] },
  { metric: 'lovedPugs', category: 'growth', coinBase: 120, desc: (n) => `親密度 MAX のパグが ${n} 匹`, tiers: [[1, '大好き！'], [10, 'パグに愛されし者', { title: 'love', frame: 'sakura' }]] },
  { metric: 'pets', category: 'growth', coinBase: 40, desc: (n) => `パグを ${n} 回なでる`, tiers: [[1, 'なでなで'], [30, 'なでなで上手'], [100, 'ゴッドハンド']] },

  { metric: 'stagesCleared', category: 'challenge', coinBase: 100, desc: (n) => `チャレンジを ${n} ステージクリア`, tiers: [
    [1, 'チャレンジ開始'], [10, 'ステージ10突破', { title: 'challenger' }], [20, 'ステージ20突破'], [30, 'チャレンジ制覇', { pp: 15 }] ] },
  { metric: 'stars', category: 'challenge', coinBase: 120, desc: (n) => `チャレンジの★を ${n} 個あつめる`, tiers: [[30, '星あつめ'], [60, '星の収集家'], [90, '全★', { title: 'all-stars', pp: 20 }]] },
  { metric: 'cupWins', category: 'challenge', coinBase: 150, desc: (n) => `パグカップで ${n} 回優勝`, tiers: [[1, '初優勝', { title: 'champion' }], [5, '常勝パグ'], [20, '殿堂入り']] },
  { metric: 'cupsWon', category: 'challenge', coinBase: 300, desc: (n) => `${n} 種類の大会で優勝`, tiers: [[3, '3大会制覇'], [6, '全大会優勝', { title: 'daiou', frame: 'gold', pp: 30 }]] },

  { metric: 'gardenSize', category: 'garden', coinBase: 150, desc: (n) => (n === 8 ? 'お庭を 8×8 にひろげる' : 'お庭を 10×10 にひろげる'), tiers: [[8, 'お庭がひろくなった'], [10, 'ひろいお庭', { title: 'garden-lord' }]] },
  { metric: 'gardenPlaced', category: 'garden', coinBase: 80, desc: (n) => `お庭に家具を ${n} こ置く`, tiers: [[5, 'お庭づくり'], [15, '庭師', { title: 'gardener' }], [30, 'にぎやかなお庭']] },
  { metric: 'furnitureKinds', category: 'garden', coinBase: 150, desc: (n) => `家具を ${n} 種類そろえる`, tiers: [[8, '家具あつめ'], [16, '家具コンプリート']] },

  { metric: 'loginDays', category: 'other', coinBase: 60, desc: (n) => `のべ ${n} 日ログインする`, tiers: [[3, '3日目のパグ'], [7, '1週間'], [30, '1か月', { title: 'regular' }], [100, '100日のパグ', { pp: 20 }]] },
  { metric: 'earnedCoins', category: 'other', coinBase: 100, desc: (n) => `コインを累計 ${n.toLocaleString()} 枚かせぐ`, tiers: [[1000, 'こづかいかせぎ'], [10000, 'ちょきん上手'], [50000, 'お金持ちパグ', { title: 'rich' }]] },
  { metric: 'earnedPP', category: 'other', coinBase: 100, desc: (n) => `パグポイントを累計 ${n} かせぐ`, tiers: [[50, 'ポイントあつめ'], [200, 'ポイント長者']] },
  { metric: 'achievements', category: 'other', coinBase: 200, desc: (n) => `実績を ${n} 個解除する`, tiers: [[25, '実績ハンター'], [50, '実績マニア'], [90, '伝説のパグマスター', { title: 'legend', pp: 50 }]] },
];

export const ACHIEVEMENTS: Achievement[] = GROUPS.flatMap((g) =>
  g.tiers.map(([goal, name, extra], i) => ({
    id: `${g.metric}-${goal}`,
    name,
    desc: g.desc(goal),
    category: g.category,
    metric: g.metric,
    goal,
    coins: g.coinBase * (i + 1),
    pp: extra?.pp ?? (i >= 2 ? 2 : 0),
    ...(extra?.title ? { title: extra.title } : {}),
    ...(extra?.frame ? { frame: extra.frame } : {}),
  })),
);
export const ACH_BY_ID: Record<string, Achievement> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
