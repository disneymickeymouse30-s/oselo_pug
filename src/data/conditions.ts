/**
 * 解放条件（データ駆動）
 * パグ・着せ替えアイテム・将来の実績で共通利用する。条件の種類を増やすときはここだけ変更する。
 */
import type { Difficulty } from '../core/ai';

export type Condition =
  | { t: 'start' }
  | { t: 'games'; n: number }
  | { t: 'wins'; n: number }
  /** 指定難易度「以上」の CPU に n 勝 */
  | { t: 'winsLv'; lv: Difficulty; n: number }
  | { t: 'duo'; n: number }
  | { t: 'streak'; n: number }
  | { t: 'margin'; n: number }
  | { t: 'perfect' }
  | { t: 'corners4' }
  | { t: 'winWhite'; n: number }
  | { t: 'comeback' }
  | { t: 'draw' }
  | { t: 'collect'; n: number }
  /** 季節限定：その月に対局（または通算 orGames 局でいつでも解放） */
  | { t: 'season'; months: number[]; label: string; orGames: number }
  /** 夜ふかし：22時〜翌4時に対局 */
  | { t: 'night' };

/** 解放判定に使う通算記録（第6段階の戦績・統計の土台にもなる） */
export interface PlayStats {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  /** CPU 戦の難易度別勝利数 */
  winsByLevel: Record<Difficulty, number>;
  duoGames: number;
  streak: number;
  bestStreak: number;
  bestMargin: number;
  perfects: number;
  corners4Wins: number;
  winsAsWhite: number;
  comebacks: number;
  /** 対局したことのある月（1〜12） */
  months: number[];
  playedAtNight: boolean;
  /** 第5段階：チャレンジのクリア回数・大会の出場/優勝回数 */
  challengeClears: number;
  cupEntries: number;
  cupWins: number;
  /** 第6段階の戦績用：CPU 難易度別の対局数、対局時間の合計、自分の駒数の合計 */
  gamesByLevel: Record<Difficulty, number>;
  totalDurationMs: number;
  totalMyDiscs: number;
  /** 第6段階：平均を出すための件数と、なでた回数 */
  timedGames: number;
  discGames: number;
  pets: number;
}

export const emptyStats = (): PlayStats => ({
  games: 0, wins: 0, losses: 0, draws: 0,
  winsByLevel: { easy: 0, normal: 0, hard: 0 },
  duoGames: 0, streak: 0, bestStreak: 0, bestMargin: 0, perfects: 0,
  corners4Wins: 0, winsAsWhite: 0, comebacks: 0, months: [], playedAtNight: false,
  challengeClears: 0, cupEntries: 0, cupWins: 0,
  gamesByLevel: { easy: 0, normal: 0, hard: 0 }, totalDurationMs: 0, totalMyDiscs: 0, timedGames: 0, discGames: 0, pets: 0,
});

const LV_ORDER: Difficulty[] = ['easy', 'normal', 'hard'];
const LV_NAME: Record<Difficulty, string> = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };

export function winsAtOrAbove(s: PlayStats, lv: Difficulty): number {
  return LV_ORDER.slice(LV_ORDER.indexOf(lv)).reduce((a, l) => a + s.winsByLevel[l], 0);
}

/** 条件の達成度 [現在値, 目標値] */
export function progressOf(c: Condition, s: PlayStats, collected: number): [number, number] {
  switch (c.t) {
    case 'start': return [1, 1];
    case 'games': return [s.games, c.n];
    case 'wins': return [s.wins, c.n];
    case 'winsLv': return [winsAtOrAbove(s, c.lv), c.n];
    case 'duo': return [s.duoGames, c.n];
    case 'streak': return [s.bestStreak, c.n];
    case 'margin': return [s.bestMargin, c.n];
    case 'perfect': return [s.perfects, 1];
    case 'corners4': return [s.corners4Wins, 1];
    case 'winWhite': return [s.winsAsWhite, c.n];
    case 'comeback': return [s.comebacks, 1];
    case 'draw': return [s.draws, 1];
    case 'collect': return [collected, c.n];
    case 'season':
      return c.months.some((m) => s.months.includes(m)) ? [1, 1] : [s.games, c.orGames];
    case 'night': return [s.playedAtNight ? 1 : 0, 1];
  }
}

export function isMet(c: Condition, s: PlayStats, collected: number): boolean {
  const [cur, goal] = progressOf(c, s, collected);
  return cur >= goal;
}

/** 図鑑に表示する入手方法 */
export function describe(c: Condition): string {
  switch (c.t) {
    case 'start': return 'さいしょから仲間';
    case 'games': return `対局を ${c.n} 回する`;
    case 'wins': return `CPU に ${c.n} 回勝つ`;
    case 'winsLv': return `${LV_NAME[c.lv]} 以上の CPU に ${c.n} 回勝つ`;
    case 'duo': return `ふたりであそぶを ${c.n} 回する`;
    case 'streak': return `CPU に ${c.n} 連勝する`;
    case 'margin': return `CPU に ${c.n} 個差以上で勝つ`;
    case 'perfect': return 'CPU にパーフェクト勝利（相手の駒0）';
    case 'corners4': return '1局で角を4つとも取って CPU に勝つ';
    case 'winWhite': return `白パグ（後手）で CPU に ${c.n} 回勝つ`;
    case 'comeback': return 'CPU に10個以上リードされてから逆転勝ち';
    case 'draw': return '引き分けになる';
    case 'collect': return `パグを ${c.n} 種類あつめる`;
    case 'season': return `${c.label}に対局する（または通算 ${c.orGames} 回対局）`;
    case 'night': return '夜ふかし（22時〜4時）に対局する';
  }
}
