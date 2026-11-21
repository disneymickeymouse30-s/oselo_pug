/**
 * パグの着せ替えパーツ（SVG）
 * すべて「顔座標」（顔が x:10〜90 / y:12〜93 に収まる 100×100 空間）で描く。
 * 帽子は y がマイナスまではみ出してよい（PugArt 側で縮小して収める）。
 */
import type { ReactElement } from 'react';

export type HatId =
  | 'crown' | 'tiara' | 'ninja' | 'santa' | 'towel' | 'goggles' | 'headband' | 'helmet'
  | 'explorer' | 'chef' | 'pilot' | 'kabuto' | 'wizard' | 'halo' | 'horns' | 'flower'
  | 'beret' | 'party' | 'ribbon' | 'cowboy' | 'graduation' | 'catears' | 'bunny' | 'tophat'
  | 'hachimaki' | 'nightcap' | 'beanie' | 'straw' | 'pumpkin' | 'star';

export type AccId =
  | 'bowtie' | 'scarf' | 'glasses' | 'sunglasses' | 'monocle' | 'bandana' | 'necklace'
  | 'cape' | 'wings' | 'batwings' | 'lei' | 'bell' | 'heart';

/** 顔の後ろに描くアクセサリー */
export const ACC_BEHIND: ReadonlySet<AccId> = new Set(['cape', 'wings', 'batwings']);

const GOLD = '#f2b829';
const GOLD_D = '#b9810c';

export const HATS: Record<HatId, { name: string; draw: () => ReactElement }> = {
  crown: {
    name: '王冠',
    draw: () => (
      <g>
        <path d="M26 30 L28 6 L39 20 L50 0 L61 20 L72 6 L74 30 Z" fill={GOLD} stroke={GOLD_D} strokeWidth="2" strokeLinejoin="round" />
        <rect x="25" y="24" width="50" height="8" rx="3" fill="#ffd968" stroke={GOLD_D} strokeWidth="2" />
        <circle cx="50" cy="28" r="3.2" fill="#e2405a" />
        <circle cx="37" cy="28" r="2.4" fill="#3c8fe0" />
        <circle cx="63" cy="28" r="2.4" fill="#3cb371" />
        <circle cx="50" cy="0" r="3" fill="#ffd968" stroke={GOLD_D} strokeWidth="1.5" />
      </g>
    ),
  },
  tiara: {
    name: 'ティアラ',
    draw: () => (
      <g>
        <path d="M30 28 Q32 16 40 18 Q44 6 50 4 Q56 6 60 18 Q68 16 70 28 Q50 22 30 28Z" fill="#e8ecf4" stroke="#9aa6bd" strokeWidth="2" />
        <path d="M50 8 L54 14 L50 20 L46 14 Z" fill="#f59bb0" stroke="#d7708a" strokeWidth="1" />
        <circle cx="40" cy="22" r="2" fill="#8fd3ff" />
        <circle cx="60" cy="22" r="2" fill="#8fd3ff" />
      </g>
    ),
  },
  ninja: {
    name: '忍者ずきん',
    draw: () => (
      <g>
        <path d="M14 40 Q14 14 50 12 Q86 14 86 40 Q68 34 50 34 Q32 34 14 40Z" fill="#2b3550" />
        <rect x="38" y="20" width="24" height="10" rx="2" fill="#c6ccd8" stroke="#7a8496" strokeWidth="1.5" />
        <path d="M44 25 h12" stroke="#7a8496" strokeWidth="1.5" />
        <path d="M84 30 Q98 26 102 36 Q94 34 90 40 Z" fill="#2b3550" />
        <path d="M84 32 Q96 40 96 50 Q90 44 86 42 Z" fill="#2b3550" />
      </g>
    ),
  },
  santa: {
    name: 'サンタぼうし',
    draw: () => (
      <g>
        <path d="M22 30 Q30 4 56 -2 Q76 -4 84 16 L78 30 Z" fill="#e0353f" />
        <rect x="16" y="24" width="70" height="12" rx="6" fill="#fff" />
        <circle cx="86" cy="16" r="7" fill="#fff" />
      </g>
    ),
  },
  towel: {
    name: '温泉タオル',
    draw: () => (
      <g>
        <rect x="28" y="4" width="44" height="16" rx="4" fill="#fff" stroke="#9ccde8" strokeWidth="2" />
        <path d="M30 9 h40 M30 15 h40" stroke="#9ccde8" strokeWidth="2" />
        <text x="50" y="-2" fontSize="11" textAnchor="middle" fill="#9ccde8">♨</text>
      </g>
    ),
  },
  goggles: {
    name: '水中メガネ',
    draw: () => (
      <g>
        <path d="M12 30 Q50 20 88 30" stroke="#ff7aa0" strokeWidth="5" fill="none" />
        <ellipse cx="38" cy="26" rx="10" ry="8" fill="#8fe0ff" fillOpacity="0.8" stroke="#ff7aa0" strokeWidth="3" />
        <ellipse cx="62" cy="26" rx="10" ry="8" fill="#8fe0ff" fillOpacity="0.8" stroke="#ff7aa0" strokeWidth="3" />
        <ellipse cx="35" cy="23" rx="3" ry="2" fill="#fff" opacity="0.8" />
        <ellipse cx="59" cy="23" rx="3" ry="2" fill="#fff" opacity="0.8" />
      </g>
    ),
  },
  headband: {
    name: 'ヘアバンド',
    draw: () => (
      <g>
        <path d="M13 32 Q50 18 87 32 L86 40 Q50 27 14 40 Z" fill="#e0353f" />
        <path d="M14 36 Q50 23 86 36" stroke="#fff" strokeWidth="2" fill="none" />
      </g>
    ),
  },
  helmet: {
    name: '宇宙ヘルメット',
    draw: () => (
      <g>
        <circle cx="50" cy="52" r="50" fill="#bfe3ff" fillOpacity="0.22" stroke="#dfe6ef" strokeWidth="5" />
        <path d="M20 22 Q32 8 48 6" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8" />
        <rect x="14" y="94" width="72" height="10" rx="5" fill="#dfe6ef" stroke="#9aa6bd" strokeWidth="2" />
        <line x1="78" y1="10" x2="88" y2="-8" stroke="#9aa6bd" strokeWidth="3" />
        <circle cx="89" cy="-10" r="5" fill="#ff5b6e" />
      </g>
    ),
  },
  explorer: {
    name: '探検ぼうし',
    draw: () => (
      <g>
        <ellipse cx="50" cy="28" rx="42" ry="9" fill="#c9a66b" stroke="#8e6d3a" strokeWidth="2" />
        <path d="M28 28 Q28 2 50 2 Q72 2 72 28 Z" fill="#d8b97f" stroke="#8e6d3a" strokeWidth="2" />
        <rect x="28" y="20" width="44" height="6" fill="#6b4a2a" />
      </g>
    ),
  },
  chef: {
    name: 'コック帽',
    draw: () => (
      <g stroke="#cfc6b8" strokeWidth="2" fill="#fff">
        <circle cx="36" cy="6" r="12" />
        <circle cx="64" cy="6" r="12" />
        <circle cx="50" cy="-2" r="14" />
        <rect x="30" y="8" width="40" height="22" rx="3" />
      </g>
    ),
  },
  pilot: {
    name: 'パイロット帽',
    draw: () => (
      <g>
        <path d="M16 38 Q16 6 50 4 Q84 6 84 38 Q68 26 50 26 Q32 26 16 38Z" fill="#8a5a3c" />
        <path d="M14 34 Q8 52 18 58 L22 40 Z M86 34 Q92 52 82 58 L78 40 Z" fill="#8a5a3c" />
        <circle cx="39" cy="20" r="8" fill="#9fd8ff" stroke="#c99a3a" strokeWidth="3" />
        <circle cx="61" cy="20" r="8" fill="#9fd8ff" stroke="#c99a3a" strokeWidth="3" />
      </g>
    ),
  },
  kabuto: {
    name: 'かぶと',
    draw: () => (
      <g>
        <path d="M50 14 L26 -14 L34 -14 L50 4 L66 -14 L74 -14 Z" fill={GOLD} stroke={GOLD_D} strokeWidth="1.5" />
        <path d="M14 38 Q16 6 50 4 Q84 6 86 38 Q68 28 50 28 Q32 28 14 38Z" fill="#3a3a52" />
        <path d="M10 36 L22 46 L22 36 Z M90 36 L78 46 L78 36 Z" fill="#3a3a52" />
        <circle cx="50" cy="16" r="5" fill={GOLD} />
      </g>
    ),
  },
  wizard: {
    name: '魔法ぼうし',
    draw: () => (
      <g>
        <path d="M26 28 L58 -24 L74 28 Z" fill="#6a4bc4" />
        <ellipse cx="50" cy="28" rx="36" ry="7" fill="#58399f" />
        <path d="M55 2 l2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5Z" fill="#ffd968" />
        <circle cx="44" cy="16" r="1.8" fill="#ffd968" />
        <circle cx="62" cy="-8" r="1.5" fill="#ffd968" />
      </g>
    ),
  },
  halo: {
    name: '天使のわっか',
    draw: () => (
      <g>
        <ellipse cx="50" cy="2" rx="24" ry="7" fill="none" stroke="#ffe680" strokeWidth="8" opacity="0.4" />
        <ellipse cx="50" cy="2" rx="24" ry="7" fill="none" stroke={GOLD} strokeWidth="4" />
      </g>
    ),
  },
  horns: {
    name: '悪魔のツノ',
    draw: () => (
      <g fill="#d2334a">
        <path d="M28 24 Q18 6 26 -4 Q30 10 40 18 Z" />
        <path d="M72 24 Q82 6 74 -4 Q70 10 60 18 Z" />
      </g>
    ),
  },
  flower: {
    name: '花かんむり',
    draw: () => (
      <g>
        {[
          [20, 30, '#f59bb0'], [32, 20, '#ffd968'], [44, 15, '#f59bb0'], [56, 15, '#fff'],
          [68, 20, '#ffd968'], [80, 30, '#f59bb0'],
        ].map(([x, y, c], i) => (
          <g key={i}>
            {[0, 72, 144, 216, 288].map((a) => (
              <circle key={a} cx={(x as number) + 4 * Math.cos((a * Math.PI) / 180)} cy={(y as number) + 4 * Math.sin((a * Math.PI) / 180)} r="3.6" fill={c as string} />
            ))}
            <circle cx={x as number} cy={y as number} r="2.4" fill="#e89a2a" />
          </g>
        ))}
        <path d="M26 26 L36 24 M62 22 L72 24" stroke="#6cbf5a" strokeWidth="3" />
      </g>
    ),
  },
  beret: {
    name: 'ベレー帽',
    draw: () => (
      <g>
        <ellipse cx="44" cy="18" rx="34" ry="13" fill="#c8384a" transform="rotate(-10 44 18)" />
        <rect x="42" y="2" width="4" height="7" rx="2" fill="#c8384a" />
      </g>
    ),
  },
  party: {
    name: 'パーティー帽',
    draw: () => (
      <g>
        <path d="M36 24 L54 -18 L68 24 Z" fill="#4fb3e8" />
        <path d="M41 12 L62 12 M46 0 L58 0" stroke="#ffd968" strokeWidth="4" />
        <circle cx="54" cy="-18" r="5" fill="#f59bb0" />
      </g>
    ),
  },
  ribbon: {
    name: 'リボン',
    draw: () => (
      <g>
        <path d="M72 16 L56 6 L58 26 Z" fill="#f2557a" />
        <path d="M72 16 L88 6 L86 26 Z" fill="#f2557a" />
        <circle cx="72" cy="16" r="5" fill="#d43c62" />
      </g>
    ),
  },
  cowboy: {
    name: 'カウボーイハット',
    draw: () => (
      <g>
        <path d="M4 22 Q20 36 50 32 Q80 36 96 22 Q86 34 50 38 Q14 34 4 22Z" fill="#8a5a3c" />
        <path d="M30 30 Q28 4 42 6 Q50 12 58 6 Q72 4 70 30 Z" fill="#a46f48" />
        <rect x="30" y="24" width="40" height="5" fill="#5a3a28" />
      </g>
    ),
  },
  graduation: {
    name: '博士帽',
    draw: () => (
      <g>
        <path d="M30 24 Q50 32 70 24 L70 14 L30 14 Z" fill="#26262e" />
        <polygon points="50,-2 92,10 50,22 8,10" fill="#33333d" />
        <path d="M50 10 L84 14 L84 30" stroke={GOLD} strokeWidth="2.5" fill="none" />
        <circle cx="84" cy="32" r="3" fill={GOLD} />
      </g>
    ),
  },
  catears: {
    name: 'ネコ耳',
    draw: () => (
      <g>
        <path d="M22 28 L26 -2 L46 16 Z" fill="#f0a25a" />
        <path d="M78 28 L74 -2 L54 16 Z" fill="#f0a25a" />
        <path d="M28 22 L30 8 L40 16 Z M72 22 L70 8 L60 16 Z" fill="#f7b9c8" />
      </g>
    ),
  },
  bunny: {
    name: 'ウサ耳',
    draw: () => (
      <g>
        <ellipse cx="36" cy="-4" rx="8" ry="24" fill="#fff" stroke="#e6dcd0" strokeWidth="2" transform="rotate(-12 36 -4)" />
        <ellipse cx="64" cy="-4" rx="8" ry="24" fill="#fff" stroke="#e6dcd0" strokeWidth="2" transform="rotate(12 64 -4)" />
        <ellipse cx="36" cy="-4" rx="4" ry="17" fill="#f7b9c8" transform="rotate(-12 36 -4)" />
        <ellipse cx="64" cy="-4" rx="4" ry="17" fill="#f7b9c8" transform="rotate(12 64 -4)" />
        <rect x="24" y="16" width="52" height="6" rx="3" fill="#f59bb0" />
      </g>
    ),
  },
  tophat: {
    name: 'シルクハット',
    draw: () => (
      <g>
        <rect x="32" y="-16" width="36" height="38" rx="3" fill="#1e1b22" />
        <rect x="32" y="10" width="36" height="6" fill="#c8384a" />
        <ellipse cx="50" cy="22" rx="30" ry="6" fill="#1e1b22" />
      </g>
    ),
  },
  hachimaki: {
    name: 'はちまき',
    draw: () => (
      <g>
        <path d="M13 30 Q50 18 87 30 L87 39 Q50 27 13 39 Z" fill="#fff" stroke="#ddd" strokeWidth="1" />
        <circle cx="50" cy="28" r="4.5" fill="#e0353f" />
        <path d="M86 32 Q100 28 104 38 M86 36 Q98 42 100 52" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
      </g>
    ),
  },
  nightcap: {
    name: 'ナイトキャップ',
    draw: () => (
      <g>
        <path d="M20 32 Q30 2 62 -2 Q84 0 92 26 Q80 14 68 14 Q50 16 80 32 Z" fill="#5c7fd6" />
        <rect x="16" y="26" width="66" height="10" rx="5" fill="#dbe5ff" />
        <circle cx="92" cy="28" r="6" fill="#ffd968" />
        <circle cx="46" cy="14" r="1.6" fill="#ffd968" />
        <circle cx="60" cy="6" r="1.6" fill="#ffd968" />
      </g>
    ),
  },
  beanie: {
    name: 'ニット帽',
    draw: () => (
      <g>
        <path d="M16 34 Q18 2 50 0 Q82 2 84 34 Z" fill="#e0603f" />
        {[26, 36, 46, 56, 66, 76].map((x) => <path key={x} d={`M${x} 6 L${x} 32`} stroke="#c94a2e" strokeWidth="2" />)}
        <rect x="14" y="28" width="72" height="10" rx="5" fill="#f2f0e6" />
        <circle cx="50" cy="-2" r="7" fill="#f2f0e6" />
      </g>
    ),
  },
  straw: {
    name: '麦わら帽子',
    draw: () => (
      <g>
        <ellipse cx="50" cy="28" rx="44" ry="10" fill="#f3d27a" stroke="#c9a54a" strokeWidth="2" />
        <path d="M28 28 Q28 4 50 4 Q72 4 72 28 Z" fill="#f6dc8e" stroke="#c9a54a" strokeWidth="2" />
        <rect x="28" y="20" width="44" height="6" fill="#e0353f" />
      </g>
    ),
  },
  pumpkin: {
    name: 'かぼちゃ',
    draw: () => (
      <g>
        <ellipse cx="50" cy="12" rx="26" ry="16" fill="#f28c28" />
        <path d="M50 -4 Q40 12 50 28 M50 -4 Q60 12 50 28 M36 0 Q30 12 36 26 M64 0 Q70 12 64 26" stroke="#d0701a" strokeWidth="2" fill="none" />
        <path d="M48 -4 Q48 -12 54 -14" stroke="#4f9a3f" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M42 10 L46 6 L48 12 Z M58 10 L54 6 L52 12 Z" fill="#3d2010" />
      </g>
    ),
  },
  star: {
    name: 'スターピン',
    draw: () => (
      <g>
        <path d="M70 0 l4.7 9.5 10.5 1.5 -7.6 7.4 1.8 10.4 -9.4 -4.9 -9.4 4.9 1.8 -10.4 -7.6 -7.4 10.5 -1.5Z" fill="#ffd968" stroke={GOLD_D} strokeWidth="2" strokeLinejoin="round" />
      </g>
    ),
  },
};

export const ACCS: Record<AccId, { name: string; draw: () => ReactElement }> = {
  bowtie: {
    name: '蝶ネクタイ',
    draw: () => (
      <g>
        <path d="M50 94 L34 86 L34 102 Z M50 94 L66 86 L66 102 Z" fill="#e0353f" />
        <circle cx="50" cy="94" r="4" fill="#b8202b" />
      </g>
    ),
  },
  scarf: {
    name: 'マフラー',
    draw: () => (
      <g>
        <path d="M18 86 Q50 100 82 86 L84 96 Q50 110 16 96 Z" fill="#3c8fe0" />
        <path d="M66 96 L72 116 L82 114 L76 94 Z" fill="#3c8fe0" />
        <path d="M24 92 Q50 104 78 92" stroke="#fff" strokeWidth="2" strokeDasharray="4 4" fill="none" />
      </g>
    ),
  },
  glasses: {
    name: 'まるメガネ',
    draw: () => (
      <g fill="none" stroke="#5a3a28" strokeWidth="3">
        <circle cx="34" cy="50" r="12" />
        <circle cx="66" cy="50" r="12" />
        <path d="M46 49 Q50 46 54 49" />
        <path d="M22 48 L12 44 M78 48 L88 44" />
      </g>
    ),
  },
  sunglasses: {
    name: 'サングラス',
    draw: () => (
      <g>
        <path d="M20 44 L48 44 L46 56 Q34 62 22 54 Z" fill="#111" />
        <path d="M80 44 L52 44 L54 56 Q66 62 78 54 Z" fill="#111" />
        <rect x="18" y="42" width="64" height="4" rx="2" fill="#111" />
        <path d="M26 48 L32 48" stroke="#fff" strokeWidth="2" opacity="0.6" />
        <path d="M58 48 L64 48" stroke="#fff" strokeWidth="2" opacity="0.6" />
      </g>
    ),
  },
  monocle: {
    name: '片メガネ',
    draw: () => (
      <g fill="none" stroke={GOLD} strokeWidth="3">
        <circle cx="66" cy="50" r="12" fill="#fff" fillOpacity="0.15" />
        <path d="M76 58 Q84 76 74 94" strokeWidth="1.5" />
      </g>
    ),
  },
  bandana: {
    name: 'バンダナ',
    draw: () => (
      <g>
        <path d="M20 86 Q50 96 80 86 L50 110 Z" fill="#3c6fd6" />
        <circle cx="42" cy="94" r="2" fill="#fff" />
        <circle cx="56" cy="96" r="2" fill="#fff" />
        <circle cx="50" cy="102" r="2" fill="#fff" />
      </g>
    ),
  },
  necklace: {
    name: '金のネックレス',
    draw: () => (
      <g>
        <path d="M22 88 Q50 104 78 88" stroke={GOLD} strokeWidth="3" fill="none" />
        <path d="M50 96 L56 102 L50 110 L44 102 Z" fill="#e2405a" stroke={GOLD_D} strokeWidth="1.5" />
      </g>
    ),
  },
  cape: {
    name: 'マント',
    draw: () => (
      <g>
        <path d="M6 70 Q2 110 18 114 L82 114 Q98 110 94 70 Q50 92 6 70Z" fill="#c8384a" />
        <path d="M14 84 Q50 100 86 84 L84 92 Q50 108 16 92Z" fill="#fff" />
        <circle cx="20" cy="88" r="3" fill="#333" />
        <circle cx="34" cy="94" r="3" fill="#333" />
        <circle cx="66" cy="94" r="3" fill="#333" />
        <circle cx="80" cy="88" r="3" fill="#333" />
      </g>
    ),
  },
  wings: {
    name: '天使の羽',
    draw: () => (
      <g fill="#fff" stroke="#e3e8f2" strokeWidth="2">
        <path d="M16 64 Q-12 40 -8 72 Q-4 92 16 84 Z" />
        <path d="M84 64 Q112 40 108 72 Q104 92 84 84 Z" />
        <path d="M2 68 Q6 74 14 74 M100 68 Q96 74 86 74" fill="none" />
      </g>
    ),
  },
  batwings: {
    name: '悪魔の羽',
    draw: () => (
      <g fill="#3a2440">
        <path d="M18 60 L-8 44 L-4 60 L-12 64 L-2 72 L-8 82 L16 78 Z" />
        <path d="M82 60 L108 44 L104 60 L112 64 L102 72 L108 82 L84 78 Z" />
      </g>
    ),
  },
  lei: {
    name: 'レイ',
    draw: () => (
      <g>
        {Array.from({ length: 9 }, (_, i) => {
          const t = i / 8;
          const x = 18 + 64 * t;
          const y = 88 + 12 * Math.sin(Math.PI * t);
          return <circle key={i} cx={x} cy={y} r="5" fill={['#f2557a', '#ffd968', '#ff9a3c'][i % 3]} />;
        })}
      </g>
    ),
  },
  bell: {
    name: '鈴つき首輪',
    draw: () => (
      <g>
        <path d="M18 86 Q50 98 82 86 L82 92 Q50 104 18 92 Z" fill="#e0353f" />
        <circle cx="50" cy="100" r="6" fill={GOLD} stroke={GOLD_D} strokeWidth="1.5" />
        <path d="M45 100 H55" stroke={GOLD_D} strokeWidth="1.5" />
      </g>
    ),
  },
  heart: {
    name: 'ハートのほっぺ',
    draw: () => (
      <g fill="#f2557a">
        <path d="M84 18 c-4 -6 -12 -2 -10 4 c1 4 10 10 10 10 s9 -6 10 -10 c2 -6 -6 -10 -10 -4Z" />
        <path d="M14 66 c-2 -3 -6 -1 -5 2 c.5 2 5 5 5 5 s4.5 -3 5 -5 c1 -3 -3 -5 -5 -2Z" opacity="0.8" />
      </g>
    ),
  },
};
