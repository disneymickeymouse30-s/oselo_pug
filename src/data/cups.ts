/**
 * パグカップ（CPU とのトーナメント）
 * 1回戦から順に勝ち抜き、全勝で優勝。負けたらその大会は敗退（何度でも再挑戦できる）。
 * 引き分けはその試合をやり直し。
 */
import { BLACK, WHITE, type Player } from '../core/othello';
import type { Difficulty } from '../core/ai';

export interface CupMatch {
  /** 対戦相手のパグ（図鑑の id。見た目と名前に使う） */
  pug: string;
  level: Difficulty;
}

export interface Cup {
  id: string;
  name: string;
  desc: string;
  /** プレイヤーの色（'alt' は1回戦から黒・白を交互に） */
  color: Player | 'alt';
  matches: CupMatch[];
  /** 出場条件：この大会で優勝していること */
  requires?: string;
  reqLv: number;
  coins: number;
  pp: number;
}

// prettier-ignore
export const CUPS: Cup[] = [
  { id: 'first',  name: 'はじめてのパグカップ', desc: 'パグたちのはじめての大会。のんびりパグが相手だよ。', color: BLACK, reqLv: 1,
    matches: [{ pug: 'apricot', level: 'easy' }, { pug: 'silver', level: 'easy' }, { pug: 'ribbon', level: 'easy' }], coins: 200, pp: 5 },
  { id: 'green',  name: 'グリーンガーデン杯',   desc: '芝生のスタジアムで行われる伝統の大会。', color: 'alt', requires: 'first', reqLv: 3,
    matches: [{ pug: 'bandana', level: 'easy' }, { pug: 'glasses', level: 'normal' }, { pug: 'explorer', level: 'normal' }], coins: 400, pp: 10 },
  { id: 'black',  name: 'ブラックパグ杯',       desc: '黒パグ（先手）だけで戦う大会。先手の利を生かせ！', color: BLACK, requires: 'green', reqLv: 6,
    matches: [{ pug: 'bowtie', level: 'normal' }, { pug: 'rock', level: 'normal' }, { pug: 'ninja', level: 'hard' }], coins: 600, pp: 15 },
  { id: 'white',  name: 'ホワイトパグ杯',       desc: '白パグ（後手）だけで戦う大会。守りの技が光る。', color: WHITE, requires: 'black', reqLv: 9,
    matches: [{ pug: 'scarf', level: 'normal' }, { pug: 'princess', level: 'hard' }, { pug: 'angel', level: 'hard' }], coins: 800, pp: 20 },
  { id: 'master', name: 'マスターパグ杯',       desc: '強豪だけが集まる大会。全試合が最強パグ。', color: 'alt', requires: 'white', reqLv: 12,
    matches: [{ pug: 'samurai', level: 'hard' }, { pug: 'wizard', level: 'hard' }, { pug: 'queen', level: 'hard' }, { pug: 'king', level: 'hard' }], coins: 1500, pp: 30 },
  { id: 'ou',     name: 'パグ王決定戦',         desc: 'すべてのパグの頂点を決める、伝説の大会。', color: 'alt', requires: 'master', reqLv: 15,
    matches: [{ pug: 'devil', level: 'hard' }, { pug: 'gold', level: 'hard' }, { pug: 'ghost', level: 'hard' }, { pug: 'galaxy', level: 'hard' }, { pug: 'daiou', level: 'hard' }], coins: 3000, pp: 50 },
];
export const CUP_BY_ID: Record<string, Cup> = Object.fromEntries(CUPS.map((c) => [c.id, c]));

export const ROUND_NAMES = (n: number, i: number) => (i === n - 1 ? '決勝' : i === n - 2 ? '準決勝' : `${i + 1}回戦`);

export function humanColorFor(cup: Cup, round: number): Player {
  if (cup.color !== 'alt') return cup.color;
  return round % 2 === 0 ? BLACK : WHITE;
}
