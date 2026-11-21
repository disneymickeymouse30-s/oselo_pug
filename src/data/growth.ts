/**
 * 育成・報酬のルール（数値はすべてここで調整する）
 *
 * 大切なルール：パグの育成状態はオセロの強さに一切影響しない（CPU・ヒントは育成データを参照しない）。
 */
import type { Difficulty } from '../core/ai';
import type { Rarity } from './pugs';

// ---------------- プレイヤー ----------------
export const PLAYER_MAX_LV = 99;
/** プレイヤーが次のレベルに上がるのに必要な経験値 */
export const playerExpToNext = (lv: number) => 100 + (lv - 1) * 40;
/** プレイヤーのレベルアップ報酬 */
export const LEVELUP_PP = 5;

// ---------------- パグ ----------------
export const PUG_MAX_LV = 30;
export const pugExpToNext = (lv: number) => 60 + (lv - 1) * 25;
export const LOVE_MAX = 100;
/** なでる（1日1回・パグごと） */
export const PET_LOVE = 5;

export interface GrowthStage { id: string; name: string; from: number }
export const STAGES: GrowthStage[] = [
  { id: 'puppy', name: 'こいぬ', from: 1 },
  { id: 'young', name: 'わかもの', from: 5 },
  { id: 'adult', name: 'おとな', from: 15 },
  { id: 'master', name: 'マスター', from: 30 },
];
export const stageOf = (lv: number) => [...STAGES].reverse().find((s) => lv >= s.from)!;

/** レベルで解放されるもの */
export const MILESTONES = [
  { lv: 5, key: 'profile', label: '専用プロフィール' },
  { lv: 10, key: 'wink', label: 'ウインクの表情' },
  { lv: 20, key: 'love', label: 'ハートの表情' },
  { lv: 30, key: 'frame', label: '金の額縁（マスターの証）' },
] as const;

export const loveHearts = (love: number) => Math.min(5, Math.floor(love / 20));

// ---------------- 対局の報酬 ----------------
export interface RewardTable { exp: number; coins: number }
export const REWARDS: Record<'win' | 'lose', Record<Difficulty, RewardTable>> & { draw: RewardTable; duo: RewardTable } = {
  win: { easy: { exp: 30, coins: 20 }, normal: { exp: 50, coins: 40 }, hard: { exp: 80, coins: 70 } },
  lose: { easy: { exp: 10, coins: 5 }, normal: { exp: 15, coins: 8 }, hard: { exp: 20, coins: 12 } },
  draw: { exp: 20, coins: 15 },
  duo: { exp: 15, coins: 10 },
};
export const BONUS = {
  perfect: { coins: 50, pp: 3 },
  corners4: { coins: 20, pp: 0 },
  hardWin: { coins: 0, pp: 2 },
};
/** パートナーの親密度（対局ごと） */
export const GAME_LOVE = { win: 2, other: 1 };

// ---------------- おやつ（コイン・パグポイントの使い道） ----------------
export interface Treat { id: string; name: string; icon: string; coins: number; pp: number; exp: number; love: number }
export const TREATS: Treat[] = [
  { id: 'sasami', name: 'ささみ', icon: '🍗', coins: 50, pp: 0, exp: 60, love: 3 },
  { id: 'bone', name: 'ほねガム', icon: '🦴', coins: 120, pp: 0, exp: 150, love: 5 },
  { id: 'cake', name: 'スペシャルケーキ', icon: '🎂', coins: 0, pp: 5, exp: 400, love: 10 },
];

// ---------------- お店（先に解放する） ----------------
/** パグポイントでパグを迎える（N・R のみ。SR 以上は条件を満たしたときだけ） */
export const PUG_PRICE_PP: Partial<Record<Rarity, number>> = { N: 10, R: 25 };
/** コインで盤面・背景を解放 */
export const ITEM_PRICE_COINS: Record<string, number> = {
  'board:wood': 200, 'board:sakura': 600, 'board:ocean': 800, 'board:night': 1200, 'board:gold': 2000,
  'bg:field': 150, 'bg:sky': 300, 'bg:beach': 500, 'bg:stars': 900, 'bg:onsen': 1200,
};

// ---------------- 専用プロフィール（Lv5 で解放） ----------------
// [好きなもの, 特技, 口ぐせ]
// prettier-ignore
export const PROFILES: Record<string, [string, string, string]> = {
  normal: ['ひなたぼっこ', 'どこでも寝られる', 'ふがっ'],
  black: ['黒ごまプリン', '暗やみで目が光る', 'クールにいこうぜ'],
  white: ['ミルク', '雪に溶けこむ', 'よごれちゃう〜'],
  apricot: ['あんずジャム', 'おやつの時間を当てる', 'もうすぐ3時だね'],
  silver: ['月夜のさんぽ', 'ポーカーフェイス', '……ふっ'],
  sleepy: ['ふかふかの枕', '3秒で寝る', 'むにゃ…あと5分…'],
  ribbon: ['お祝いのケーキ', 'リボン結び', 'おめでと〜！'],
  bowtie: ['紅茶', 'ていねいなおじぎ', 'よろしくお願いいたします'],
  beanie: ['こたつ', 'あみもの', 'さむいさむい'],
  bandana: ['新しい散歩道', '道を覚える', '今日はあっちに行こう'],
  scarf: ['ホットココア', '首をすくめる', 'ぬくぬく〜'],
  glasses: ['定石の本', '早読み', 'データによると…'],
  party: ['クラッカー（音以外）', '盛り上げ役', 'パーティーしよ！'],
  straw: ['夏まつり', 'すいか割り', 'あついね〜'],
  friend: ['みんなで遊ぶこと', '仲なおりの仲介', 'いっしょにやろ！'],
  draw: ['引き分け', 'おどろくこと', 'えっ!?'],
  sports: ['朝ラン', '全力ダッシュ', 'ファイトー！'],
  chef: ['ささみのソテー', '味見', 'ボナペティ！'],
  explorer: ['地図', 'ほり当てる', 'この先に何かある！'],
  pilot: ['青い空', '風を読む', 'テイクオフ！'],
  onsen: ['露天ぶろ', '長ぶろ', 'ごくらく〜'],
  beach: ['海', '犬かき', 'うみだー！'],
  sakura: ['お花見だんご', '花びらキャッチ', 'はるだね〜'],
  cowboy: ['夕日', '投げなわ', 'ヒーハー！'],
  artist: ['絵の具', 'デッサン', '動かないで！'],
  gentleman: ['シルクハットの手入れ', 'エスコート', 'お先にどうぞ'],
  doctor: ['論文', '計算', '仮説どおりだ'],
  cat: ['ねこじゃらし', 'ネコのまね', 'にゃ…わん'],
  bunny: ['にんじん', 'ころころ転がる', 'ぴょん！（ころん）'],
  pumpkin: ['かぼちゃプリン', 'いたずら', 'トリック・オア・トリート！'],
  ninja: ['まきびし（おもちゃ）', '気配を消す', 'ニンニン'],
  samurai: ['おにぎり', '素振り', 'いざ、まいる！'],
  santa: ['プレゼント選び', '夜ふかし（12/24だけ）', 'メリークリスマス！'],
  wizard: ['星のかけら', 'ちょっとした手品', 'ちちんぷいぷい'],
  space: ['流れ星', '無重力ダンス', 'こちらパグ1号'],
  prince: ['逆転劇', 'あきらめないこと', 'ここからだよ'],
  princess: ['ティーパーティー', 'ワルツ', 'ごきげんよう'],
  rock: ['ギター', 'シャウト', 'イェーイ！'],
  aloha: ['パイナップル', 'フラダンス', 'アロ〜ハ'],
  corner: ['角っこ', '角取り', '角はオレのもの'],
  collector: ['めずらしいもの', '鑑定', 'これは掘り出し物だ'],
  king: ['玉座', '号令', 'よきにはからえ'],
  queen: ['午後のお茶', '王様をしかる', 'おだまりなさい'],
  angel: ['ふわふわ雲', 'しあわせを運ぶ', 'えへへ'],
  devil: ['ちょっとしたいたずら', 'ずっと見ている', 'ふっふっふ'],
  gold: ['ぴかぴかのもの', 'ご利益', 'なでていいよ'],
  ghost: ['夜の図書館', 'すりぬけ', 'うらめしや〜…なんて'],
  star: ['ステージ', 'ウインク', 'キラッ☆'],
  rainbow: ['雨上がり', 'みんなをつなぐ', 'にじ、見えた？'],
  daiou: ['すべてのパグ', '威厳', 'わしがパグ大王じゃ'],
  galaxy: ['夜空', '星座づくり', '宇宙はひろいね'],
  master: ['オセロ', 'パグと話す', 'よくぞここまで'],
};
