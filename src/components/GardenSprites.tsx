/**
 * お庭の絵：家具（斜め上から見た絵）とパグの全身（歩く・寝る・食べる・遊ぶ・座る・お風呂）
 * 家具の SVG は 横 w×100、縦 spriteH×100 の座標で描き、下端が家具の占有マスの下端にそろう。
 */
import { memo, type ReactElement } from 'react';
import { COATS, PugArt, type CoatId } from './PugFace';
import type { HatId, AccId } from './parts';
import type { Season } from '../data/garden';
import type { PugPose } from '../core/garden';

const WOOD = '#c98a4e';
const WOOD_D = '#8e5a2c';
const STONE = '#c9c3bb';
const STONE_D = '#9a938a';
const WATER = '#8fd3f5';

const shadow = (cx: number, cy: number, rx: number, ry: number) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#000" opacity="0.13" />;

type Draw = (o: { season: Season; night: boolean }) => ReactElement;

const TREE_COLORS: Record<Season, [string, string]> = {
  spring: ['#f7b8c8', '#f39ab2'],
  summer: ['#6cbf5a', '#4f9a3f'],
  autumn: ['#f2a93b', '#e0702a'],
  winter: ['#5e9a6a', '#4a7f56'],
};

export const FURNITURE_ART: Record<string, Draw> = {
  doghouse: () => (
    <g>
      {shadow(100, 235, 90, 12)}
      <rect x="22" y="105" width="156" height="128" rx="6" fill={WOOD} stroke={WOOD_D} strokeWidth="4" />
      {[135, 165, 195].map((y) => <path key={y} d={`M24 ${y} H176`} stroke={WOOD_D} strokeWidth="2" opacity=".4" />)}
      <polygon points="6,116 100,28 194,116" fill="#e0453f" stroke="#a82c28" strokeWidth="5" strokeLinejoin="round" />
      <path d="M70 233 V178 a30 30 0 0 1 60 0 V233 Z" fill="#3d2518" />
      <rect x="78" y="128" width="44" height="18" rx="4" fill="#fff4d8" stroke={WOOD_D} strokeWidth="2" />
      <text x="100" y="142" fontSize="13" fontWeight="bold" textAnchor="middle" fill="#8e5a2c">PUG</text>
    </g>
  ),
  bed: () => (
    <g>
      {shadow(50, 84, 46, 9)}
      <ellipse cx="50" cy="72" rx="46" ry="24" fill="#f59bb0" stroke="#d7708a" strokeWidth="3" />
      <ellipse cx="50" cy="70" rx="33" ry="15" fill="#ffd3de" />
      <path d="M26 70 Q50 60 74 70" stroke="#f59bb0" strokeWidth="2" fill="none" />
    </g>
  ),
  bowl: () => (
    <g>
      {shadow(50, 70, 36, 6)}
      <path d="M16 46 H84 L76 68 Q50 76 24 68 Z" fill="#e0453f" stroke="#a82c28" strokeWidth="3" />
      <ellipse cx="50" cy="46" rx="34" ry="9" fill="#a8673a" />
      {[38, 48, 58, 44, 54].map((x, i) => <circle key={i} cx={x} cy={44 + (i % 2) * 3} r="4" fill="#c98448" />)}
      <path d="M38 58 c-2 -3 -6 -1 -5 2 c.5 2 5 4 5 4 s4.5 -2 5 -4 c1 -3 -3 -5 -5 -2Z" fill="#fff" opacity=".8" />
    </g>
  ),
  bone: () => (
    <g>
      {shadow(50, 66, 34, 6)}
      <g transform="rotate(-12 50 52)" fill="#fffaf0" stroke="#d9c9ad" strokeWidth="3">
        <rect x="26" y="46" width="48" height="12" rx="6" />
        <circle cx="24" cy="46" r="8" /><circle cx="24" cy="58" r="8" />
        <circle cx="76" cy="46" r="8" /><circle cx="76" cy="58" r="8" />
      </g>
    </g>
  ),
  tree: ({ season }) => {
    const [a, b] = TREE_COLORS[season];
    return (
      <g>
        {shadow(50, 232, 34, 8)}
        <path d="M43 232 L45 150 H55 L57 232 Z" fill="#8a5a3c" />
        <circle cx="50" cy="104" r="42" fill={b} />
        <circle cx="32" cy="128" r="28" fill={a} />
        <circle cx="68" cy="128" r="28" fill={a} />
        <circle cx="50" cy="84" r="30" fill={a} />
        {season === 'winter' && <path d="M24 82 Q50 52 76 82 Q60 74 50 76 Q38 74 24 82Z" fill="#fff" />}
        {season === 'autumn' && <circle cx="62" cy="98" r="5" fill="#e0453f" />}
        {season === 'spring' && [[36, 96], [62, 114], [48, 70]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="4" fill="#fff" />)}
      </g>
    );
  },
  flower: ({ season }) => {
    const colors = season === 'winter' ? ['#fff', '#e8f0ff', '#fff'] : season === 'autumn' ? ['#f2a93b', '#e0702a', '#ffd968'] : ['#f2557a', '#ffd968', '#8a6be0'];
    return (
      <g>
        {shadow(100, 124, 96, 7)}
        {[20, 46, 72, 98, 124, 150, 176].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 86 V${54 + (i % 2) * 10}`} stroke="#4f9a3f" strokeWidth="3" />
            {[0, 72, 144, 216, 288].map((d) => (
              <circle key={d} cx={x + 7 * Math.cos((d * Math.PI) / 180)} cy={50 + (i % 2) * 10 + 7 * Math.sin((d * Math.PI) / 180)} r="6" fill={colors[i % 3]} />
            ))}
            <circle cx={x} cy={50 + (i % 2) * 10} r="4" fill="#f2b829" />
          </g>
        ))}
        <rect x="4" y="82" width="192" height="40" rx="6" fill="#c0704a" stroke="#8e4a2c" strokeWidth="3" />
        {[24, 60, 96, 132, 168].map((x) => <path key={x} d={`M${x} 84 V120`} stroke="#8e4a2c" strokeWidth="2" opacity=".5" />)}
      </g>
    );
  },
  bench: () => (
    <g>
      {shadow(100, 132, 90, 7)}
      <rect x="22" y="96" width="8" height="34" fill={WOOD_D} />
      <rect x="170" y="96" width="8" height="34" fill={WOOD_D} />
      <rect x="10" y="84" width="180" height="16" rx="4" fill={WOOD} stroke={WOOD_D} strokeWidth="3" />
      <rect x="14" y="34" width="172" height="14" rx="4" fill={WOOD} stroke={WOOD_D} strokeWidth="3" />
      <rect x="14" y="56" width="172" height="14" rx="4" fill={WOOD} stroke={WOOD_D} strokeWidth="3" />
      <rect x="24" y="44" width="6" height="42" fill={WOOD_D} />
      <rect x="170" y="44" width="6" height="42" fill={WOOD_D} />
    </g>
  ),
  lamp: ({ night }) => (
    <g>
      {shadow(50, 234, 22, 6)}
      <rect x="46" y="60" width="8" height="172" fill="#3d3a4a" />
      <rect x="36" y="224" width="28" height="10" rx="3" fill="#3d3a4a" />
      <path d="M30 60 L38 28 H62 L70 60 Z" fill={night ? '#fff3a0' : '#e8eef7'} stroke="#3d3a4a" strokeWidth="4" />
      <path d="M32 26 H68 L60 14 H40 Z" fill="#3d3a4a" />
    </g>
  ),
  fountain: () => (
    <g>
      {shadow(100, 208, 96, 12)}
      <ellipse cx="100" cy="176" rx="94" ry="34" fill={STONE} stroke={STONE_D} strokeWidth="4" />
      <ellipse cx="100" cy="170" rx="80" ry="24" fill={WATER} />
      <rect x="90" y="96" width="20" height="74" fill={STONE} stroke={STONE_D} strokeWidth="3" />
      <ellipse cx="100" cy="96" rx="40" ry="12" fill={STONE} stroke={STONE_D} strokeWidth="3" />
      <ellipse cx="100" cy="93" rx="32" ry="7" fill={WATER} />
      <g className="water-jet" stroke="#bfe8ff" strokeWidth="5" fill="none" strokeLinecap="round">
        <path d="M100 88 Q100 30 100 20" />
        <path d="M98 40 Q70 46 64 92" />
        <path d="M102 40 Q130 46 136 92" />
      </g>
      <ellipse cx="80" cy="172" rx="12" ry="3" fill="#fff" opacity=".6" />
    </g>
  ),
  xmastree: ({ season, night }) => {
    const lit = season === 'winter' || night;
    return (
      <g>
        {shadow(50, 272, 38, 8)}
        <rect x="42" y="236" width="16" height="36" fill="#8a5a3c" />
        {[[50, 40, 236, 46], [50, 70, 196, 40], [50, 100, 150, 32]].map(([cx, top, bottom, half], i) => (
          <polygon key={i} points={`${cx},${top} ${cx - half},${bottom} ${cx + half},${bottom}`} fill={['#2f8a4a', '#3aa055', '#46b462'][i]} />
        ))}
        <path d="M50 22 l5 10 11 1 -8 7 3 11 -11 -6 -11 6 3 -11 -8 -7 11 -1Z" fill="#ffd968" stroke="#c99a12" strokeWidth="2" />
        {[[38, 140, '#e0453f'], [62, 168, '#ffd968'], [30, 200, '#4fb3e8'], [70, 214, '#f59bb0'], [50, 186, '#e0453f'], [44, 112, '#4fb3e8']].map(([x, y, c], i) => (
          <circle key={i} className={lit ? 'twinkle' : ''} style={{ animationDelay: `${i * 0.3}s` }} cx={x as number} cy={y as number} r="6" fill={c as string} />
        ))}
      </g>
    );
  },
  pool: () => (
    <g>
      {shadow(100, 116, 98, 6)}
      <rect x="4" y="10" width="192" height="104" rx="28" fill="#fff" stroke="#c7dfe8" strokeWidth="4" />
      <rect x="16" y="20" width="168" height="84" rx="20" fill={WATER} />
      <g className="ripple" stroke="#fff" strokeWidth="3" fill="none" opacity=".7" strokeLinecap="round">
        <path d="M40 50 q10 -6 20 0 t20 0" /><path d="M110 76 q10 -6 20 0 t20 0" />
      </g>
      <g stroke="#9aa6bd" strokeWidth="4"><path d="M164 6 V40 M178 6 V40 M164 18 H178 M164 30 H178" /></g>
      <circle cx="56" cy="80" r="12" fill="none" stroke="#f2557a" strokeWidth="7" />
    </g>
  ),
  playground: () => (
    <g>
      {shadow(100, 232, 96, 10)}
      <rect x="20" y="60" width="8" height="172" fill="#4fb3e8" />
      <rect x="64" y="60" width="8" height="172" fill="#4fb3e8" />
      {[90, 120, 150, 180, 210].map((y) => <rect key={y} x="24" y={y} width="44" height="6" rx="2" fill="#ffd968" />)}
      <rect x="14" y="52" width="64" height="14" rx="4" fill="#e0453f" />
      <path d="M14 52 L46 18 L78 52 Z" fill="#ffd968" stroke="#c99a12" strokeWidth="3" />
      <path d="M72 62 C120 70 130 200 196 222 L196 236 C120 216 108 86 72 80 Z" fill="#f2b829" stroke="#c98f12" strokeWidth="3" />
    </g>
  ),
  cafe: () => (
    <g>
      {shadow(150, 272, 146, 10)}
      <rect x="14" y="86" width="272" height="184" rx="6" fill="#fff4e0" stroke="#c9a47a" strokeWidth="4" />
      <path d="M4 92 L30 40 H270 L296 92 Z" fill="#8a5a3c" />
      <g>
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${14 + i * 30.2} 92 h30.2 v22 a15.1 12 0 0 1 -30.2 0Z`} fill={i % 2 ? '#fff' : '#e0453f'} />
        ))}
      </g>
      <rect x="92" y="48" width="116" height="30" rx="8" fill="#fff" stroke="#8a5a3c" strokeWidth="3" />
      <text x="150" y="69" fontSize="19" fontWeight="900" textAnchor="middle" fill="#8a5a3c">PUG CAFE</text>
      <rect x="34" y="140" width="80" height="62" rx="6" fill="#bfe6ff" stroke="#c9a47a" strokeWidth="4" />
      <path d="M74 140 V202 M34 171 H114" stroke="#c9a47a" strokeWidth="3" />
      <path d="M180 270 V170 a28 28 0 0 1 56 0 V270Z" fill="#a46f48" stroke="#8a5a3c" strokeWidth="3" />
      <circle cx="226" cy="222" r="4" fill="#ffd968" />
      <g transform="translate(52 228)"><ellipse cx="0" cy="0" rx="14" ry="6" fill="#f59bb0" /><path d="M-10 0 Q0 -26 10 0" fill="#fff" /><circle cx="0" cy="-18" r="4" fill="#e0453f" /></g>
    </g>
  ),
  onsen: () => (
    <g>
      {shadow(150, 152, 146, 8)}
      <ellipse cx="150" cy="104" rx="140" ry="50" fill={STONE_D} />
      <ellipse cx="150" cy="100" rx="122" ry="38" fill="#9fe0e8" />
      {[[22, 100], [60, 136], [120, 146], [190, 146], [248, 132], [280, 98], [250, 66], [50, 66]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="26" ry="16" fill={i % 2 ? STONE : '#b8b2a8'} stroke={STONE_D} strokeWidth="2" />
      ))}
      <g className="steam" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".8">
        <path d="M110 70 q-10 -14 0 -28 t0 -28" /><path d="M150 64 q-10 -14 0 -28 t0 -28" /><path d="M190 70 q-10 -14 0 -28 t0 -28" />
      </g>
      <rect x="254" y="10" width="40" height="40" rx="6" fill="#fff" stroke="#8a5a3c" strokeWidth="3" />
      <text x="274" y="40" fontSize="26" textAnchor="middle" fill="#e0453f">♨</text>
    </g>
  ),
  tower: () => (
    <g>
      {shadow(100, 352, 90, 10)}
      <g stroke={WOOD_D} strokeWidth="9" strokeLinecap="round">
        <path d="M30 352 L52 130" /><path d="M170 352 L148 130" />
        <path d="M40 270 L160 270" strokeWidth="6" /><path d="M46 200 L154 200" strokeWidth="6" />
        <path d="M34 330 L150 200 M166 330 L50 200" strokeWidth="4" />
      </g>
      <rect x="20" y="110" width="160" height="24" rx="4" fill={WOOD} stroke={WOOD_D} strokeWidth="4" />
      <path d="M30 110 V70 M170 110 V70" stroke={WOOD_D} strokeWidth="6" />
      <rect x="30" y="86" width="140" height="6" fill={WOOD_D} />
      <path d="M10 72 L100 16 L190 72 Z" fill="#4f9a3f" stroke="#3a7d30" strokeWidth="4" strokeLinejoin="round" />
      <path d="M100 16 V2" stroke="#3a7d30" strokeWidth="4" /><path d="M100 2 l20 6 -20 6Z" fill="#e0453f" />
    </g>
  ),
  castle: () => (
    <g>
      {shadow(150, 412, 146, 12)}
      <rect x="40" y="200" width="220" height="210" fill="#e8e2d8" stroke="#b8ae9e" strokeWidth="4" />
      {[50, 90, 130, 170, 210, 250].map((x) => <rect key={x} x={x - 10} y="186" width="20" height="18" fill="#e8e2d8" stroke="#b8ae9e" strokeWidth="3" />)}
      {[[40, 150], [260, 150], [150, 90]].map(([cx, top], i) => (
        <g key={i}>
          <rect x={cx - 30} y={top + 60} width="60" height={410 - top - 60} fill="#f2ede4" stroke="#b8ae9e" strokeWidth="4" />
          <polygon points={`${cx - 38},${top + 62} ${cx},${top} ${cx + 38},${top + 62}`} fill="#4f7fd6" stroke="#3a5fa8" strokeWidth="4" strokeLinejoin="round" />
          <path d={`M${cx} ${top} V${top - 26}`} stroke="#3a5fa8" strokeWidth="3" />
          <path d={`M${cx} ${top - 26} l22 7 -22 7Z`} fill={i === 2 ? '#f2b829' : '#e0453f'} />
          <rect x={cx - 9} y={top + 90} width="18" height="28" rx="9" fill="#3d3a4a" />
        </g>
      ))}
      <path d="M120 410 V340 a30 30 0 0 1 60 0 V410Z" fill="#8a5a3c" stroke="#5a3a28" strokeWidth="4" />
      <path d="M140 250 l10 -14 10 14 -10 14Z" fill="#f2b829" />
    </g>
  ),
};

/** パグの全身（横向き・左向きが基本） */
function PugBodyImpl({ coat, hat, acc, pose, mood }: {
  coat: CoatId; hat?: HatId; acc?: AccId; pose: PugPose; mood?: 'normal' | 'happy' | 'sleep' | 'surprised' | 'wink' | 'love';
}) {
  const p = COATS[coat];
  const fill = p.gradient ? p.gradient[1] : p.face;
  const faceMood = pose === 'sleep' ? 'sleep' : pose === 'bath' ? 'sleep' : mood ?? (pose === 'play' || pose === 'eat' || pose === 'sit' ? 'happy' : 'normal');
  const lying = pose === 'sleep';
  const headY = lying ? 34 : pose === 'eat' ? 26 : pose === 'bath' ? 26 : 8;
  return (
    <svg viewBox="0 0 100 100" className={`pug-body pose-${pose}`} aria-hidden="true">
      {pose !== 'bath' && <ellipse cx="54" cy="95" rx="34" ry="5" fill="#000" opacity=".15" />}
      {pose !== 'bath' && (
        <g opacity={p.opacity}>
          {/* しっぽ */}
          <path className="tail" d={lying ? 'M84 82 q10 -2 8 -10 q-2 -6 -8 -2' : 'M82 58 q12 -6 8 -16 q-4 -8 -12 -2 q-4 6 2 8'} stroke={fill} strokeWidth="6" fill="none" strokeLinecap="round" />
          {!lying && (
            <g fill={fill} stroke={p.rim} strokeWidth="1.5">
              <rect className="leg leg-a" x="34" y="76" width="9" height="19" rx="4" />
              <rect className="leg leg-b" x="46" y="76" width="9" height="19" rx="4" />
              {pose !== 'sit' && <rect className="leg leg-b" x="66" y="76" width="9" height="19" rx="4" />}
              {pose !== 'sit' && <rect className="leg leg-a" x="77" y="76" width="9" height="19" rx="4" />}
            </g>
          )}
          <ellipse cx={pose === 'sit' ? 60 : 60} cy={lying ? 82 : pose === 'sit' ? 74 : 68} rx={lying ? 32 : 28} ry={lying ? 12 : pose === 'sit' ? 20 : 17} fill={fill} stroke={p.rim} strokeWidth="1.5" />
          {pose === 'sit' && <ellipse cx="72" cy="90" rx="12" ry="6" fill={fill} stroke={p.rim} strokeWidth="1.5" />}
        </g>
      )}
      <svg className="pug-head" x="2" y={headY} width="62" height="62" overflow="visible">
        <PugArt coat={coat} hat={hat} acc={pose === 'bath' ? undefined : acc} mood={faceMood} framed={Boolean(hat || acc)} />
      </svg>
      {pose === 'bath' && (
        <g>
          <ellipse cx="34" cy="86" rx="40" ry="10" fill={WATER} opacity=".85" />
          <path d="M6 84 q8 -4 16 0 t16 0 t16 0 t16 0" stroke="#fff" strokeWidth="2.5" fill="none" />
        </g>
      )}
      {pose === 'sleep' && <text className="zzz" x="56" y="30" fontSize="16" fontWeight="900" fill="#7a8bd6">z</text>}
    </svg>
  );
}
export const PugBody = memo(PugBodyImpl);
