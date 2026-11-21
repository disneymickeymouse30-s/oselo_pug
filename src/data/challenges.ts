/**
 * チャレンジモードのステージ（データ駆動）
 * - clear：クリア条件（★1）、star2・star3：追加の星の条件
 * - start：特定の盤面から始めるステージ（詰めオセロ）。盤面は完全読みで「最善手なら勝てる」ことを確認済み
 * - series：連戦ステージ。1つでも負けたら失敗
 */
import { BLACK, WHITE, EMPTY, type Board, type Player } from '../core/othello';
import type { Difficulty } from '../core/ai';

export type Objective =
  | { t: 'win' }
  | { t: 'margin'; n: number }
  | { t: 'corners'; n: number }
  | { t: 'comeback' }
  | { t: 'bigFlip'; n: number }
  | { t: 'totalFlips'; n: number }
  | { t: 'perfect' }
  | { t: 'movesWithin'; n: number }
  | { t: 'noUndo' }
  | { t: 'noHint' };

export interface StartPosition { board: Board; turn: Player }

export interface Stage {
  id: string;
  no: number;
  title: string;
  level: Difficulty;
  /** プレイヤーの色 */
  human: Player;
  clear: Objective[];
  star2: Objective;
  star3: Objective;
  start?: StartPosition;
  /** 連戦（各試合の CPU の強さ） */
  series?: Difficulty[];
  coins: number;
  exp: number;
  hint: string;
}

export const parseBoard = (rows: string[]): Board =>
  rows.join('').split('').map((c) => (c === 'B' ? BLACK : c === 'W' ? WHITE : EMPTY)) as Board;

// 詰めオセロの盤面（scripts/gen-puzzles.ts で生成・検証）
// prettier-ignore
const P = {
  p1: { board: parseBoard(['B.WWWWWW', '.WWWBBWW', 'WWWBBBWW', 'BWBBBBBB', '.WBBBW.B', 'BWWWWBBB', 'BWWW.WWW', '..WB.WWW']), turn: BLACK },
  p2: { board: parseBoard(['.WWWWWW.', 'BWWWWWW.', 'BBBBWB.W', 'BBBBBW.W', 'BWBBBBWW', 'WBBBBBB.', 'BWWWBBB.', 'BWWW.B.B']), turn: WHITE },
  p3: { board: parseBoard(['BBBBB.B.', 'BBWWBBB.', 'BBBBBBBB', '..WWBWWW', 'WBWWBWW.', 'WBWWWWBB', 'WWWWW.BB', 'W.WWWW..']), turn: BLACK },
  p4: { board: parseBoard(['.WWWWW.W', '.BWBBWWB', 'W.BBBWBB', 'WWBBWBB.', 'WWBWBBBW', 'WWWBBB..', 'WWWWWWWW', 'WBBB..W.']), turn: BLACK },
  p5: { board: parseBoard(['WBBB.W..', '.WWWWWW.', 'WBWWWWWW', '.BBWBWWW', '.BWBBWWW', 'BBBBBWBW', 'WBWWBB.B', '.BBBBB..']), turn: WHITE },
  p6: { board: parseBoard(['WB.WBW.W', '.B.BBWWW', 'WBBWBWW.', '.BBWWBWW', '.BBWWBBW', '..WBBBBB', '.WBBBBBB', 'WWWWWWW.']), turn: WHITE },
  p7: { board: parseBoard(['.W.B....', 'WWWW..B.', 'WW.WWWBB', 'WBWWWWBW', 'WBWBWBWW', 'WWBBBBBW', 'WWWWWWWW', '.BWWWWW.']), turn: BLACK },
  comeback1: { board: parseBoard(['W.BWWWW.', '.WBWWWWB', '..BWWWWW', '.BBWBWW.', '..WWBWWW', '.WWBBWWW', 'WWWWWW.W', 'WBBWWWB.']), turn: BLACK },
  comeback2: { board: parseBoard(['...W.W..', 'WBWWWWW.', 'WBBWWWWW', 'WBWBWWWB', 'WBWBBWB.', 'WBWWWBWW', 'BBWWWW..', '.W.BBWWW']), turn: BLACK },
  bigflip: { board: parseBoard(['BBBB.BWB', 'WWWBWWBB', 'W.WWWBBB', '.WWWBBBB', '.BWWWBBB', 'BBWBBBBB', 'WBBWW...', 'WBWWW...']), turn: BLACK },
} satisfies Record<string, StartPosition>;

const W: Objective = { t: 'win' };
const NU: Objective = { t: 'noUndo' };
const NH: Objective = { t: 'noHint' };

type Row = [title: string, level: Difficulty, human: Player, clear: Objective[], s2: Objective, s3: Objective, extra: Partial<Stage> & { hint: string }];
// prettier-ignore
const ROWS: Row[] = [
  ['はじめの一歩',          'easy',   BLACK, [W],                                 { t: 'margin', n: 10 },     NU,                        { hint: 'まずは勝ってみよう！ 置ける場所の肉球マークを参考にね。' }],
  ['角をねらえ',            'easy',   BLACK, [W, { t: 'corners', n: 1 }],         { t: 'corners', n: 2 },     { t: 'corners', n: 3 },    { hint: '四すみの角は一度取ったら二度と返されない、最強の場所。' }],
  ['ひっくり返せ！',        'easy',   BLACK, [W, { t: 'totalFlips', n: 30 }],     { t: 'bigFlip', n: 5 },     NH,                        { hint: '1局で合計30個以上ひっくり返して勝とう。' }],
  ['後手でも勝てる',        'easy',   WHITE, [W],                                 { t: 'margin', n: 16 },     NU,                        { hint: '白パグ（後手）での対局。あわてずにいこう。' }],
  ['詰めオセロ その1',      'easy',   BLACK, [W],                                 { t: 'margin', n: 6 },      NH,                        { hint: 'この盤面からスタート。正解の手はひとつだけ…？', start: P.p1 }],
  ['NORMAL に挑戦',         'normal', BLACK, [W],                                 { t: 'margin', n: 10 },     NU,                        { hint: 'かしこいパグとの対戦。角のとなりは危ないよ。' }],
  ['角を2つ取って勝利',     'normal', BLACK, [W, { t: 'corners', n: 2 }],         { t: 'corners', n: 3 },     NH,                        { hint: '角を2つ以上取って勝とう。' }],
  ['ひっくり返し名人',      'normal', BLACK, [W, { t: 'bigFlip', n: 6 }],         { t: 'totalFlips', n: 45 }, NU,                        { hint: '一手で6個以上ひっくり返す大技を決めて勝とう。' }],
  ['詰めオセロ その2',      'normal', WHITE, [W],                                 { t: 'margin', n: 2 },      NH,                        { hint: '白番からスタート。ぎりぎりの勝負！', start: P.p2 }],
  ['30手以内で勝利',        'normal', BLACK, [W, { t: 'movesWithin', n: 30 }],    { t: 'movesWithin', n: 28 }, NU,                       { hint: 'あなたの手数が30手以内のうちに勝とう。相手をパスさせると手数が増えるよ。' }],
  ['逆転勝利',              'normal', BLACK, [W, { t: 'comeback' }],              { t: 'margin', n: 6 },      NH,                        { hint: '大きくリードされた盤面から。あきらめないで！', start: P.comeback1 }],
  ['白番の誇り',            'normal', WHITE, [W, { t: 'margin', n: 10 }],         { t: 'corners', n: 2 },     NU,                        { hint: '後手で10個差以上の勝利をめざそう。' }],
  ['パーフェクトをめざせ',  'easy',   BLACK, [W, { t: 'margin', n: 20 }],         { t: 'margin', n: 40 },     { t: 'perfect' },          { hint: '20個差以上で勝利。相手の駒を全部なくせば★3！' }],
  ['詰めオセロ その3',      'normal', BLACK, [W],                                 { t: 'margin', n: 4 },      NH,                        { hint: 'まんなかの攻防がカギ。', start: P.p3 }],
  ['3連戦',                 'normal', BLACK, [W],                                 NU,                         NH,                        { hint: '3試合連続で勝とう。1回でも負けたら最初から。', series: ['easy', 'normal', 'normal'] }],
  ['HARD デビュー',         'hard',   BLACK, [W],                                 { t: 'margin', n: 6 },      NU,                        { hint: '最強パグとの初対戦。辺の取り合いに注意。' }],
  ['角はぜんぶオレのもの',  'normal', BLACK, [W, { t: 'corners', n: 3 }],         { t: 'corners', n: 4 },     NU,                        { hint: '角を3つ以上取って勝とう。4つ全部なら★2。' }],
  ['大差をつけろ',          'normal', BLACK, [W, { t: 'margin', n: 20 }],         { t: 'margin', n: 30 },     NH,                        { hint: '20個差以上で勝とう。' }],
  ['詰めオセロ その4',      'hard',   BLACK, [W],                                 { t: 'margin', n: 6 },      NH,                        { hint: '相手は最強パグ。最善手をさがそう。', start: P.p4 }],
  ['HARD に後手で',         'hard',   WHITE, [W],                                 { t: 'margin', n: 4 },      NU,                        { hint: '白パグで最強パグに勝とう。' }],
  ['一発逆転',              'hard',   BLACK, [W, { t: 'bigFlip', n: 8 }],         { t: 'margin', n: 6 },      NH,                        { hint: '一手で8個以上ひっくり返す大技があるらしい…', start: P.bigflip }],
  ['ノーヒント・ノーアンドゥ', 'hard', BLACK, [W, NU, NH],                         { t: 'margin', n: 6 },      { t: 'corners', n: 2 },    { hint: 'ヒントも1手戻すも使わずに HARD に勝とう。' }],
  ['詰めオセロ その5',      'hard',   WHITE, [W],                                 { t: 'margin', n: 4 },      NH,                        { hint: '白番。端の駒の数え方がポイント。', start: P.p5 }],
  ['HARD 角2つ',            'hard',   BLACK, [W, { t: 'corners', n: 2 }],         { t: 'corners', n: 3 },     NU,                        { hint: '最強パグから角を2つうばって勝とう。' }],
  ['5連戦',                 'hard',   BLACK, [W],                                 NU,                         NH,                        { hint: '5試合連続で勝とう。後半は最強パグ！', series: ['normal', 'normal', 'hard', 'hard', 'hard'] }],
  ['詰めオセロ その6',      'hard',   WHITE, [W],                                 { t: 'margin', n: 10 },     NH,                        { hint: '白番。左側の空きマスに注目。', start: P.p6 }],
  ['HARD に20個差',         'hard',   BLACK, [W, { t: 'margin', n: 20 }],         { t: 'margin', n: 30 },     NU,                        { hint: '最強パグに20個差以上で勝とう。' }],
  ['逆転のパグ',            'hard',   BLACK, [W, { t: 'comeback' }],              { t: 'margin', n: 10 },     NH,                        { hint: '20個以上リードされた盤面から大逆転！', start: P.comeback2 }],
  ['詰めオセロ その7',      'hard',   BLACK, [W],                                 { t: 'margin', n: 20 },     NH,                        { hint: '空きマス12個。もっとも長い詰めオセロ。', start: P.p7 }],
  ['パグマスターへの道',    'hard',   BLACK, [W, NU],                             { t: 'margin', n: 4 },      NH,                        { hint: '1手戻すを使わずに、最強パグに3連勝しよう。', series: ['hard', 'hard', 'hard'] }],
];

export const STAGES: Stage[] = ROWS.map(([title, level, human, clear, star2, star3, extra], i) => ({
  id: `s${String(i + 1).padStart(2, '0')}`,
  no: i + 1,
  title, level,
  human: extra.start ? extra.start.turn : human,
  clear, star2, star3,
  coins: 40 + i * 10,
  exp: 30 + i * 4,
  ...extra,
}));
export const STAGE_BY_ID: Record<string, Stage> = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export function describeObjective(o: Objective): string {
  switch (o.t) {
    case 'win': return '勝利する';
    case 'margin': return `${o.n}個差以上で勝つ`;
    case 'corners': return `角を${o.n}つ以上とる`;
    case 'comeback': return '10個以上リードされてから逆転';
    case 'bigFlip': return `一手で${o.n}個以上ひっくり返す`;
    case 'totalFlips': return `合計${o.n}個以上ひっくり返す`;
    case 'perfect': return 'パーフェクト勝利（相手の駒0）';
    case 'movesWithin': return `あなたの手数${o.n}手以内`;
    case 'noUndo': return '1手戻すを使わない';
    case 'noHint': return 'ヒントを使わない';
  }
}
