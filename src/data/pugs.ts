/**
 * パグ図鑑のキャラクターデータ
 * キャラクターを増やすときはこの配列に1行足すだけでよい（ゲーム本体の変更は不要）。
 * id は保存データのキーになるので、一度公開したら変更しないこと。
 */
import type { CoatId, PugMood } from '../components/PugFace';
import type { HatId, AccId } from '../components/parts';
import type { Condition } from './conditions';

export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'LEGEND';

export const RARITIES: Rarity[] = ['N', 'R', 'SR', 'SSR', 'LEGEND'];
export const RARITY_INFO: Record<Rarity, { label: string; color: string }> = {
  N: { label: 'ノーマル', color: '#9a8a78' },
  R: { label: 'レア', color: '#3c8fe0' },
  SR: { label: 'スーパーレア', color: '#a04fd6' },
  SSR: { label: 'スペシャルレア', color: '#e0a20f' },
  LEGEND: { label: '伝説', color: '#e2405a' },
};

export interface PugDef {
  id: string;
  no: number;
  name: string;
  rarity: Rarity;
  coat: CoatId;
  hat?: HatId;
  acc?: AccId;
  mood?: PugMood;
  desc: string;
  unlock: Condition;
}

type Row = [id: string, name: string, rarity: Rarity, coat: CoatId, hat: HatId | null, acc: AccId | null, mood: PugMood | null, desc: string, unlock: Condition];

// prettier-ignore
const ROWS: Row[] = [
  // ---- N：ノーマル ----
  ['normal',    'ノーマルパグ',     'N', 'fawn',    null,        null,        null,   'いちばんふつうで、いちばんかわいい。オセロの基本はこの子に教わろう。', { t: 'start' }],
  ['black',     '黒パグ',           'N', 'black',   null,        null,        null,   'つやつやの黒い毛並み。黒番になるとちょっと張り切る。', { t: 'start' }],
  ['white',     '白パグ',           'N', 'white',   null,        null,        null,   'まっしろでふわふわ。汚れるのが苦手なので角っこが好き。', { t: 'games', n: 1 }],
  ['apricot',   'アプリコットパグ', 'N', 'apricot', null,        null,        null,   'あんず色のあったかい毛並み。おやつの時間には正確。', { t: 'games', n: 3 }],
  ['silver',    'シルバーパグ',     'N', 'silver',  null,        null,        null,   'クールな銀色。表情が読めないので対局相手にこわがられる。', { t: 'games', n: 5 }],
  ['sleepy',    'ねぼすけパグ',     'N', 'fawn',    'nightcap',  null,        'sleep','夜になると元気になる…と思ったら寝ていた。', { t: 'night' }],
  ['ribbon',    'リボンパグ',       'N', 'fawn',    'ribbon',    null,        'happy','初めての勝利をお祝いしにやってきた。', { t: 'wins', n: 1 }],
  ['bowtie',    '蝶ネクタイパグ',   'N', 'black',   null,        'bowtie',    null,   'いつでも正装。負けても礼儀正しくおじぎする。', { t: 'wins', n: 2 }],
  ['beanie',    'ニット帽パグ',     'N', 'silver',  'beanie',    null,        null,   '寒がり。ニット帽は自分で編んだらしい。', { t: 'wins', n: 3 }],
  ['bandana',   'バンダナパグ',     'N', 'apricot', null,        'bandana',   'happy','お散歩大好き。バンダナは散歩のおまもり。', { t: 'games', n: 10 }],
  ['scarf',     'マフラーパグ',     'N', 'white',   null,        'scarf',     null,   '首もとがあったかいと、読みも深くなるとか。', { t: 'games', n: 15 }],
  ['glasses',   'メガネパグ',       'N', 'fawn',    null,        'glasses',   null,   '定石の本を読みすぎて目が悪くなった努力家。', { t: 'winsLv', lv: 'normal', n: 1 }],
  ['party',     'パーティーパグ',   'N', 'apricot', 'party',     null,        'happy','20回目の対局をお祝い！ クラッカーの音は少し苦手。', { t: 'games', n: 20 }],
  ['straw',     '麦わらパグ',       'N', 'fawn',    'straw',     null,        'happy','夏が来るといつもこの帽子。冬でもかぶっている。', { t: 'wins', n: 5 }],
  ['friend',    'なかよしパグ',     'N', 'silver',  null,        'heart',     'happy','ふたりで遊ぶのを見ているのが好き。', { t: 'duo', n: 1 }],
  ['draw',      'ひきわけパグ',     'N', 'white',   null,        null,        'surprised','32対32！ めずらしい引き分けにびっくりして出てきた。', { t: 'draw' }],

  // ---- R：レア ----
  ['sports',    'スポーツパグ',     'R', 'fawn',    'headband',  null,        'happy','毎朝のランニングが日課。ゴールの後はすぐ寝る。', { t: 'wins', n: 10 }],
  ['chef',      'シェフパグ',       'R', 'white',   'chef',      'bowtie',    null,   'パグ界の三つ星シェフ。得意料理はささみのソテー。', { t: 'games', n: 30 }],
  ['explorer',  '探検家パグ',       'R', 'apricot', 'explorer',  'scarf',     null,   'まだ誰も知らない盤面を探して旅をしている。', { t: 'winsLv', lv: 'normal', n: 5 }],
  ['pilot',     'パイロットパグ',   'R', 'fawn',    'pilot',     'scarf',     'happy','空から見ると、オセロ盤は小さな草原に見えるらしい。', { t: 'wins', n: 15 }],
  ['onsen',     '温泉パグ',         'R', 'apricot', 'towel',     null,        'sleep','ごくらく、ごくらく。のぼせる寸前まで出てこない。', { t: 'games', n: 40 }],
  ['beach',     '海水浴パグ',       'R', 'fawn',    'goggles',   'lei',       'happy','夏の海が大好き。泳ぎは…犬かき。', { t: 'season', months: [7, 8], label: '7〜8月', orGames: 100 }],
  ['sakura',    'さくらパグ',       'R', 'pink',    'flower',    null,        'happy','春にだけ会える、さくら色のパグ。', { t: 'season', months: [3, 4], label: '3〜4月', orGames: 100 }],
  ['cowboy',    'カウボーイパグ',   'R', 'apricot', 'cowboy',    'bandana',   null,   '荒野をかける後手の名手。白番で真価を発揮する。', { t: 'winWhite', n: 3 }],
  ['artist',    '画家パグ',         'R', 'silver',  'beret',     'scarf',     null,   'ふたりの対局を絵にするのが趣味。', { t: 'duo', n: 5 }],
  ['gentleman', '紳士パグ',         'R', 'black',   'tophat',    'monocle',   null,   '大差で勝っても決しておごらない、真の紳士。', { t: 'margin', n: 20 }],
  ['doctor',    '博士パグ',         'R', 'white',   'graduation','glasses',   null,   'オセロの研究で博士号をとった。論文はほぼ肉球スタンプ。', { t: 'winsLv', lv: 'normal', n: 10 }],
  ['cat',       'ネコかぶりパグ',   'R', 'apricot', 'catears',   'bell',      'happy','ネコのふりをしているが、どう見てもパグ。', { t: 'streak', n: 3 }],
  ['bunny',     'ウサギパグ',       'R', 'white',   'bunny',     null,        'happy','ぴょんぴょん跳ねるつもりが、ころころ転がる。', { t: 'games', n: 50 }],
  ['pumpkin',   'かぼちゃパグ',     'R', 'black',   'pumpkin',   null,        'happy','おばけの季節にやってくる、いたずら好き。', { t: 'season', months: [10], label: '10月', orGames: 100 }],

  // ---- SR：スーパーレア ----
  ['ninja',     '忍者パグ',         'SR', 'black',  'ninja',     null,        null,   'HARD の CPU に勝った者の前にだけ姿をあらわす。', { t: 'winsLv', lv: 'hard', n: 1 }],
  ['samurai',   '侍パグ',           'SR', 'fawn',   'kabuto',    null,        null,   '一手一手に魂をこめる。投了の二文字は知らない。', { t: 'winsLv', lv: 'hard', n: 3 }],
  ['santa',     'サンタパグ',       'SR', 'fawn',   'santa',     'bell',      'happy','12月にだけ会える。プレゼントはだいたい骨。', { t: 'season', months: [12], label: '12月', orGames: 100 }],
  ['wizard',    '魔法使いパグ',     'SR', 'silver', 'wizard',    'cape',      null,   '5連勝の魔法をかけてくれる…かもしれない。', { t: 'streak', n: 5 }],
  ['space',     '宇宙パグ',         'SR', 'white',  'helmet',    null,        'surprised','無重力でもオセロの駒は裏返せることを証明した。', { t: 'margin', n: 30 }],
  ['prince',    '王子パグ',         'SR', 'apricot','tiara',     'cape',      null,   '大逆転が大好き。ピンチになるほど笑顔になる。', { t: 'comeback' }],
  ['princess',  'お姫さまパグ',     'SR', 'white',  'tiara',     'necklace',  'happy','白番の気品。後手で勝つことこそ美しいと信じている。', { t: 'winWhite', n: 10 }],
  ['rock',      'ロックパグ',       'SR', 'black',  null,        'sunglasses',null,   'ステージでは静か。盤面の上ではシャウトする。', { t: 'wins', n: 30 }],
  ['aloha',     'アロハパグ',       'SR', 'apricot','flower',    'lei',       'happy','南の島からやってきた。勝っても負けてもアロ〜ハ。', { t: 'wins', n: 25 }],
  ['corner',    'コーナー番長パグ', 'SR', 'fawn',   'hachimaki', null,        null,   '四つの角はすべてオレのもの。それがポリシー。', { t: 'corners4' }],
  ['collector', 'コレクターパグ',   'SR', 'silver', 'explorer',  'monocle',   null,   'パグを20種類集めた人にだけ、自慢のコレクションを見せてくれる。', { t: 'collect', n: 20 }],

  // ---- SSR：スペシャルレア ----
  ['king',      '王様パグ',         'SSR', 'fawn',  'crown',     'cape',      null,   'パグの国を治める王様。HARD に10勝した者を家来にする。', { t: 'winsLv', lv: 'hard', n: 10 }],
  ['queen',     '女王様パグ',       'SSR', 'white', 'crown',     'necklace',  null,   '王様より強いという噂。お茶の時間はゆずらない。', { t: 'winsLv', lv: 'hard', n: 7 }],
  ['angel',     '天使パグ',         'SSR', 'white', 'halo',      'wings',     'happy','パーフェクト勝利のときにだけ舞いおりる。', { t: 'perfect' }],
  ['devil',     '悪魔パグ',         'SSR', 'black', 'horns',     'batwings',  null,   '10連勝のあいだ、ずっと後ろで見ていた。', { t: 'streak', n: 10 }],
  ['gold',      'ゴールドパグ',     'SSR', 'gold',  null,        'necklace',  'happy','50勝のごほうび。なでるとご利益があるらしい。', { t: 'wins', n: 50 }],
  ['ghost',     'おばけパグ',       'SSR', 'ghost', null,        null,        'surprised','30種類のパグが集まると、どこからともなく現れる。', { t: 'collect', n: 30 }],
  ['star',      'スターパグ',       'SSR', 'pink',  'star',      'necklace',  'happy','40個差の大勝利！ きらきら輝くスターの誕生。', { t: 'margin', n: 40 }],

  // ---- LEGEND：伝説 ----
  ['rainbow',   'レインボーパグ',   'LEGEND', 'rainbow', null,     'heart',    'happy','40種類のパグの想いがあつまって生まれた、虹色のパグ。', { t: 'collect', n: 40 }],
  ['daiou',     'パグ大王',         'LEGEND', 'gold',    'crown',  'cape',     null,   'HARD に30勝した真の強者の前にだけ現れる、すべてのパグの王。', { t: 'winsLv', lv: 'hard', n: 30 }],
  ['galaxy',    'ギャラクシーパグ', 'LEGEND', 'cosmos',  'star',   null,       null,   '50個差の圧勝のとき、夜空からやってきた。', { t: 'margin', n: 50 }],
  ['master',    '伝説のパグマスター','LEGEND','black',   'crown',  'necklace', 'happy','すべてのパグと出会った者だけが会える、伝説の存在。', { t: 'collect', n: 51 }],
];

export const PUGS: PugDef[] = ROWS.map(([id, name, rarity, coat, hat, acc, mood, desc, unlock], i) => ({
  id, no: i + 1, name, rarity, coat,
  ...(hat ? { hat } : {}), ...(acc ? { acc } : {}), ...(mood ? { mood } : {}),
  desc, unlock,
}));

export const PUG_BY_ID: Record<string, PugDef> = Object.fromEntries(PUGS.map((p) => [p.id, p]));
