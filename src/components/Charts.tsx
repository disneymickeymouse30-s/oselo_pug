/**
 * 軽量な SVG グラフ（ライブラリなし・オフラインで動く）
 * - 1系列のみ（タイトルで系列名を示すので凡例は不要）
 * - 細い線・2px、角の丸い棒、控えめな目盛り線
 * - ホバー／タップで十字線とツールチップ
 */
import { useState, type PointerEvent } from 'react';

const INK = 'var(--choco)';
const MUTED = '#a08a72';
const GRID = '#eadcc4';
const SERIES = '#4f9a3f';

export function LineChart({ points, yMax = 100, unit = '%', height = 170, xLabel }: {
  points: { x: number; y: number; label: string }[];
  yMax?: number;
  unit?: string;
  height?: number;
  xLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 320;
  const H = height;
  const pad = { l: 34, r: 10, t: 12, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  if (points.length === 0) return <p className="muted center chart-empty">まだデータがありません。対局するとグラフが出ます。</p>;
  const xs = (i: number) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const ys = (v: number) => pad.t + ih - (v / yMax) * ih;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)} ${ys(p.y).toFixed(1)}`).join(' ');
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((x - pad.l) / iw) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };
  const h = hover !== null ? points[hover] : null;
  const last = points[points.length - 1];
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} role="img"
        aria-label={`推移のグラフ。最新 ${last.y}${unit}`}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={ys(yMax * f)} y2={ys(yMax * f)} stroke={GRID} strokeWidth="1" />
            <text x={pad.l - 6} y={ys(yMax * f) + 4} fontSize="10" textAnchor="end" fill={MUTED}>{Math.round(yMax * f)}{unit}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* 最新値だけ直接ラベル */}
        <circle cx={xs(points.length - 1)} cy={ys(last.y)} r="4" fill={SERIES} stroke="#fff" strokeWidth="2" />
        {xLabel && <text x={W - pad.r} y={H - 6} fontSize="10" textAnchor="end" fill={MUTED}>{xLabel}</text>}
        <text x={pad.l} y={H - 6} fontSize="10" fill={MUTED}>{points[0].x}</text>
        {h && hover !== null && (
          <g pointerEvents="none">
            <line x1={xs(hover)} x2={xs(hover)} y1={pad.t} y2={pad.t + ih} stroke={MUTED} strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={xs(hover)} cy={ys(h.y)} r="5" fill={SERIES} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && (
        <div className="chart-tip" style={{ left: `${(xs(hover!) / W) * 100}%` }}>
          <b>{h.y}{unit}</b><small>{h.label}</small>
        </div>
      )}
    </div>
  );
}

export function BarChart({ bars, yMax = 100, unit = '%' }: {
  bars: { label: string; value: number; sub: string }[];
  yMax?: number;
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 320;
  const H = 160;
  const pad = { l: 34, r: 10, t: 18, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const slot = iw / bars.length;
  const bw = Math.min(56, slot * 0.5);
  const ys = (v: number) => pad.t + ih - (v / yMax) * ih;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={bars.map((b) => `${b.label} ${b.value}${unit}`).join('、')}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={ys(yMax * f)} y2={ys(yMax * f)} stroke={GRID} strokeWidth="1" />
            <text x={pad.l - 6} y={ys(yMax * f) + 4} fontSize="10" textAnchor="end" fill={MUTED}>{Math.round(yMax * f)}{unit}</text>
          </g>
        ))}
        {bars.map((b, i) => {
          const x = pad.l + slot * i + (slot - bw) / 2;
          const y = ys(b.value);
          const h = Math.max(0, pad.t + ih - y);
          const r = Math.min(4, h / 2);
          return (
            <g key={b.label} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              {/* 当たり判定は棒より大きく */}
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={ih} fill="transparent" />
              {/* 上だけ角丸、下は軸にそろえる */}
              <path d={`M${x} ${pad.t + ih} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + bw - r} Q${x + bw} ${y} ${x + bw} ${y + r} V${pad.t + ih} Z`}
                fill={SERIES} opacity={hover === null || hover === i ? 1 : 0.5} />
              <text x={x + bw / 2} y={y - 5} fontSize="11" fontWeight="800" textAnchor="middle" fill={INK}>{b.value}{unit}</text>
              <text x={x + bw / 2} y={H - 8} fontSize="11" fontWeight="700" textAnchor="middle" fill={INK}>{b.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((pad.l + slot * hover + slot / 2) / W) * 100}%` }}>
          <b>{bars[hover].label} {bars[hover].value}{unit}</b><small>{bars[hover].sub}</small>
        </div>
      )}
    </div>
  );
}
