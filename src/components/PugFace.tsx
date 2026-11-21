import { memo, type ReactElement } from 'react';
import { HATS, ACCS, ACC_BEHIND, type HatId, type AccId } from './parts';

export type PugVariant = 'black' | 'white';
export type PugMood = 'normal' | 'happy' | 'sad' | 'surprised' | 'sleep' | 'wink' | 'love';
export type CoatId = 'fawn' | 'black' | 'white' | 'apricot' | 'silver' | 'pink' | 'gold' | 'rainbow' | 'ghost' | 'cosmos';

interface Palette {
  face: string;
  mask: string;
  ear: string;
  wrinkle: string;
  iris: string;
  rim: string;
  /** 目の縁（暗い毛色では濃く） */
  eyeRim: string;
  /** にっこり目の線の色 */
  line: string;
  /** グラデーション（特別な毛色） */
  gradient?: [string, string, string];
  stars?: boolean;
  opacity?: number;
}

export const COATS: Record<CoatId, Palette & { name: string }> = {
  fawn:    { name: 'フォーン', face: '#f7ead2', mask: '#4b3a30', ear: '#4b3a30', wrinkle: '#d9c09a', iris: '#2a1d17', rim: '#d8c3a0', eyeRim: '#3a2a22', line: '#2a1d17' },
  black:   { name: 'ブラック', face: '#3b3431', mask: '#1d1816', ear: '#191412', wrinkle: '#5e5551', iris: '#7a4a24', rim: '#1a1513', eyeRim: '#0d0a09', line: '#f3e6d6' },
  white:   { name: 'ホワイト', face: '#fffdf8', mask: '#c9b0a6', ear: '#d8c4ba', wrinkle: '#eadfd4', iris: '#2a1d17', rim: '#e8ddd0', eyeRim: '#3a2a22', line: '#2a1d17' },
  apricot: { name: 'アプリコット', face: '#f1c48f', mask: '#5a3a28', ear: '#5a3a28', wrinkle: '#d9a56c', iris: '#2a1d17', rim: '#d9a56c', eyeRim: '#3a2a22', line: '#2a1d17' },
  silver:  { name: 'シルバー', face: '#d9d6d2', mask: '#3d3a3a', ear: '#3d3a3a', wrinkle: '#b8b3ad', iris: '#2a1d17', rim: '#b8b3ad', eyeRim: '#2a2626', line: '#2a1d17' },
  pink:    { name: 'さくら', face: '#ffe1e8', mask: '#8a4a5a', ear: '#c26d84', wrinkle: '#f5bccb', iris: '#2a1d17', rim: '#f5bccb', eyeRim: '#3a2a22', line: '#2a1d17' },
  gold:    { name: 'ゴールド', face: '#f6c945', mask: '#7a5210', ear: '#a8740f', wrinkle: '#e0a91f', iris: '#3a2410', rim: '#c99412', eyeRim: '#3a2410', line: '#3a2410', gradient: ['#fff1a8', '#f6c945', '#d99a12'] },
  rainbow: { name: 'レインボー', face: '#ffd1e0', mask: '#5a3a6a', ear: '#7a5fd0', wrinkle: '#ffffff', iris: '#2a1d17', rim: '#b79cff', eyeRim: '#3a2a4a', line: '#2a1d17', gradient: ['#ff9ab5', '#ffe27a', '#8fd8ff'] },
  ghost:   { name: 'ゴースト', face: '#eef4ff', mask: '#9aa9cc', ear: '#b9c6e6', wrinkle: '#d6e0f5', iris: '#4a5a8a', rim: '#c9d4ee', eyeRim: '#4a5a8a', line: '#4a5a8a', opacity: 0.82 },
  cosmos:  { name: 'ギャラクシー', face: '#2a2b5e', mask: '#14143a', ear: '#14143a', wrinkle: '#4b4d92', iris: '#c99aff', rim: '#14143a', eyeRim: '#0a0a22', line: '#f3e6ff', gradient: ['#5a3fa8', '#2a2b5e', '#0f1a3e'], stars: true },
};

export interface PugArtProps {
  coat: CoatId;
  mood?: PugMood;
  hat?: HatId | null;
  acc?: AccId | null;
  size?: number | string;
  /** オセロの駒として円形に切り抜く */
  disc?: boolean;
  /** 帽子がなくても図鑑用に余白をとる */
  framed?: boolean;
}

function Eyes({ p, mood }: { p: Palette; mood: PugMood }) {
  const eyeY = 50;
  if (mood === 'sleep' || mood === 'happy') {
    const d = mood === 'happy' ? 'M-8 2 Q0 -7 8 2' : 'M-8 -1 Q0 6 8 -1';
    return (
      <g stroke={p.line} strokeWidth="3.2" fill="none" strokeLinecap="round">
        <path d={d} transform={`translate(34 ${eyeY})`} />
        <path d={d} transform={`translate(66 ${eyeY})`} />
      </g>
    );
  }
  if (mood === 'love') {
    // ハートの目（Lv20 で解放される特別な表情）
    return (
      <g fill="#f2557a" stroke="#c8304f" strokeWidth="1.2">
        {[34, 66].map((x) => (
          <path key={x} d={`M${x} ${eyeY + 8} C${x - 14} ${eyeY - 2} ${x - 8} ${eyeY - 12} ${x} ${eyeY - 4} C${x + 8} ${eyeY - 12} ${x + 14} ${eyeY - 2} ${x} ${eyeY + 8}Z`} />
        ))}
        <circle cx="30" cy={eyeY - 4} r="2" fill="#fff" stroke="none" />
        <circle cx="62" cy={eyeY - 4} r="2" fill="#fff" stroke="none" />
      </g>
    );
  }
  const r = mood === 'surprised' ? 9 : 8;
  return (
    <g>
      {mood === 'wink' && (
        // ウインク（Lv10 で解放）：左目だけにっこり
        <path d="M26 52 Q34 43 42 52" stroke={p.line} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      )}
      {(mood === 'wink' ? [66] : [34, 66]).map((x) => (
        <g key={x}>
          <circle cx={x} cy={eyeY} r={r + 1.6} fill={p.eyeRim} />
          <circle cx={x} cy={eyeY} r={r} fill={p.iris} />
          <circle cx={x} cy={eyeY + 0.5} r={r - 2.6} fill="#0c0807" />
          <circle cx={x - 2.6} cy={eyeY - 3} r={2.6} fill="#fff" />
          <circle cx={x + 2.4} cy={eyeY + 2.6} r={1.1} fill="#fff" opacity="0.8" />
        </g>
      ))}
      {mood === 'sad' && (
        <g stroke={p.wrinkle} strokeWidth="2.4" strokeLinecap="round">
          <path d="M24 43 L40 37" />
          <path d="M76 43 L60 37" />
        </g>
      )}
    </g>
  );
}

function Mouth({ mood }: { mood: PugMood }) {
  switch (mood) {
    case 'happy':
    case 'love':
    case 'wink':
      return (
        <g>
          <path d="M42 72 Q50 82 58 72 Z" fill="#7a2a2a" />
          <path d="M45.5 75 Q50 84 54.5 75 Q50 77 45.5 75Z" fill="#f28a9b" />
        </g>
      );
    case 'sad':
      return <path d="M43 77 Q50 71 57 77" stroke="#0e0a09" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
    case 'surprised':
      return <ellipse cx="50" cy="76" rx="4" ry="5" fill="#5a1f1f" />;
    default:
      return (
        <g>
          <path d="M42 72 Q46 76 50 72 Q54 76 58 72" stroke="#0e0a09" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M47 74.5 Q50 80 53 74.5 Z" fill="#f28a9b" />
        </g>
      );
  }
}

/**
 * オリジナルのパグ（SVG）。毛色・表情・帽子・アクセサリーを組み合わせて描く。
 * オセロの駒・図鑑・ホーム・演出で共通利用する。
 */
function PugArtImpl({ coat, mood = 'normal', hat = null, acc = null, size = '100%', disc = false, framed }: PugArtProps) {
  const p = COATS[coat];
  const gid = `coat-${coat}`;
  const faceFill = p.gradient ? `url(#${gid})` : p.face;
  const scaled = framed ?? Boolean(hat || acc);
  const clipId = 'pug-disc-clip';

  const behind: ReactElement | null = acc && ACC_BEHIND.has(acc) ? ACCS[acc].draw() : null;
  const front: ReactElement | null = acc && !ACC_BEHIND.has(acc) ? ACCS[acc].draw() : null;
  const hatEl: ReactElement | null = hat ? HATS[hat].draw() : null;

  const face = (
    <g opacity={p.opacity}>
      {behind}
      {/* 耳 */}
      <path d="M14 30 Q6 16 22 12 Q34 12 34 26 Q24 26 14 38 Z" fill={p.ear} />
      <path d="M86 30 Q94 16 78 12 Q66 12 66 26 Q76 26 86 38 Z" fill={p.ear} />
      {(!disc || scaled) && <ellipse cx="50" cy="55" rx="40" ry="38" fill={faceFill} />}
      {p.stars && (
        <g fill="#fff">
          <circle cx="24" cy="44" r="1.2" /><circle cx="78" cy="38" r="1.5" /><circle cx="70" cy="80" r="1" />
          <circle cx="28" cy="78" r="1.3" /><circle cx="56" cy="26" r="1" />
        </g>
      )}
      <g stroke={p.wrinkle} strokeWidth="2.6" fill="none" strokeLinecap="round">
        <path d="M38 30 Q50 25 62 30" />
        <path d="M42 36 Q50 32 58 36" />
        <path d="M46 41 Q50 39 54 41" />
      </g>
      <ellipse cx="50" cy="68" rx="23" ry="17" fill={p.mask} />
      <path d="M30 62 Q50 54 70 62" stroke={p.wrinkle} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.7" />
      <Eyes p={p} mood={mood} />
      <path d="M43 62 Q50 57 57 62 Q57 67 50 68 Q43 67 43 62Z" fill="#0b0807" />
      <ellipse cx="47.5" cy="61.3" rx="2" ry="1.1" fill="#fff" opacity="0.35" />
      <Mouth mood={mood} />
      {(mood === 'happy' || mood === 'wink' || mood === 'love') && (
        <g fill="#f4a3b0" opacity={coat === 'black' || coat === 'cosmos' ? 0.55 : 0.75}>
          <ellipse cx="22" cy="64" rx="6" ry="4" />
          <ellipse cx="78" cy="64" rx="6" ry="4" />
        </g>
      )}
      {mood === 'sleep' && <text x="82" y="24" fontSize="16" fontWeight="bold" fill={p.line === '#f3e6d6' ? '#f3e6d6' : '#7a5c46'}>z</text>}
      {front}
      {hatEl}
    </g>
  );

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ display: 'block', overflow: disc ? 'hidden' : 'visible' }}>
      <defs>
        {p.gradient && (
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.gradient[0]} />
            <stop offset="50%" stopColor={p.gradient[1]} />
            <stop offset="100%" stopColor={p.gradient[2]} />
          </linearGradient>
        )}
        {disc && (
          <>
            <clipPath id={clipId}><circle cx="50" cy="50" r="48" /></clipPath>
            <radialGradient id="pug-disc-shade" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#fff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.25" />
            </radialGradient>
          </>
        )}
      </defs>
      <g clipPath={disc ? `url(#${clipId})` : undefined}>
        {disc && <circle cx="50" cy="50" r="50" fill={faceFill} />}
        {scaled ? <g transform="translate(10 17) scale(0.8)">{face}</g> : face}
        {disc && <circle cx="50" cy="50" r="50" fill="url(#pug-disc-shade)" />}
      </g>
      {disc && <circle cx="50" cy="50" r="47.5" fill="none" stroke={p.rim} strokeWidth="3" />}
    </svg>
  );
}

export const PugArt = memo(PugArtImpl);

/** 黒番・白番の駒／アバター用のショートカット */
export function PugFace({ variant, mood, size, disc, hat, acc }: {
  variant: PugVariant; mood?: PugMood; size?: number | string; disc?: boolean; hat?: HatId | null; acc?: AccId | null;
}) {
  return <PugArt coat={variant === 'black' ? 'black' : 'fawn'} mood={mood} size={size} disc={disc} hat={hat} acc={acc} />;
}

/** 合法手マーカー用の肉球 */
export function PawPrint({ color = 'rgba(255,255,255,0.75)' }: { color?: string }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <g fill={color}>
        <ellipse cx="50" cy="64" rx="20" ry="17" />
        <ellipse cx="27" cy="42" rx="8" ry="10" transform="rotate(-20 27 42)" />
        <ellipse cx="42" cy="30" rx="8" ry="10" transform="rotate(-6 42 30)" />
        <ellipse cx="58" cy="30" rx="8" ry="10" transform="rotate(6 58 30)" />
        <ellipse cx="73" cy="42" rx="8" ry="10" transform="rotate(20 73 42)" />
      </g>
    </svg>
  );
}

/** 置ける場所の目印（カーソル）。kind で形をかえる */
export function Marker({ kind = 'paw', color = 'rgba(255,255,255,0.95)' }: { kind?: string; color?: string }) {
  if (kind === 'paw') return <PawPrint color={color} />;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <g fill={color}>
        {kind === 'bone' && (
          <g transform="rotate(-25 50 50)">
            <rect x="26" y="42" width="48" height="16" rx="8" />
            <circle cx="24" cy="42" r="11" /><circle cx="24" cy="58" r="11" /><circle cx="76" cy="42" r="11" /><circle cx="76" cy="58" r="11" />
          </g>
        )}
        {kind === 'heart' && <path d="M50 84 C10 58 14 22 36 22 C44 22 48 28 50 32 C52 28 56 22 64 22 C86 22 90 58 50 84Z" />}
        {kind === 'star' && <path d="M50 10 l11.8 24 26.4 3.8 -19.1 18.6 4.5 26.3 L50 70.3 26.4 82.7 30.9 56.4 11.8 37.8 38.2 34Z" />}
      </g>
    </svg>
  );
}
