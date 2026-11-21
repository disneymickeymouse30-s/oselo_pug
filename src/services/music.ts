/**
 * BGM（Web Audio API でその場で合成。音声ファイル不要・オフラインで動作）
 * 画面ごとに曲を切りかえる：ホーム／対局／お庭／大会
 * ブラウザの決まりで、最初に画面をタップするまでは鳴らない。
 */
export type TrackId = 'home' | 'game' | 'garden' | 'cup';

interface Track {
  bpm: number;
  /** 8分音符ごとのメロディ（MIDI ノート番号、null は休み） */
  melody: (number | null)[];
  /** 8分音符ごとのベース */
  bass: (number | null)[];
  lead: OscillatorType;
  /** ハイハット（軽いリズム）を入れるか */
  hat: boolean;
}

const _ = null;
// prettier-ignore
const TRACKS: Record<TrackId, Track> = {
  // ホーム：明るく弾む C メジャー
  home: { bpm: 112, lead: 'triangle', hat: true,
    melody: [72, _, 76, 79, 77, 76, 74, _, 72, 74, 76, 72, 74, _, 67, _, 72, _, 76, 79, 81, 79, 77, 76, 74, 76, 74, 71, 72, _, _, _],
    bass:   [48, _, 55, _, 48, _, 55, _, 53, _, 60, _, 55, _, 50, _, 48, _, 55, _, 53, _, 57, _, 55, _, 55, _, 48, _, 55, _] },
  // 対局：考えごとのじゃまをしない、ゆったりした A マイナー
  game: { bpm: 88, lead: 'sine', hat: false,
    melody: [69, _, _, 72, _, 76, _, _, 74, _, 72, _, 71, _, _, _, 69, _, _, 72, _, 74, _, 76, 77, _, 76, _, 72, _, _, _],
    bass:   [45, _, _, _, 52, _, _, _, 41, _, _, _, 48, _, _, _, 45, _, _, _, 52, _, _, _, 43, _, _, _, 47, _, _, _] },
  // お庭：のんびり F メジャーの子守歌
  garden: { bpm: 76, lead: 'triangle', hat: false,
    melody: [77, _, 72, _, 74, 77, _, _, 79, _, 77, _, 74, _, _, _, 72, _, 74, _, 77, _, 81, _, 79, _, 77, 76, 77, _, _, _],
    bass:   [41, _, 48, _, 41, _, 48, _, 46, _, 53, _, 46, _, 53, _, 43, _, 50, _, 48, _, 52, _, 41, _, 48, _, 41, _, _, _] },
  // 大会：きびきびした D マイナー
  cup: { bpm: 132, lead: 'square', hat: true,
    melody: [74, 74, 77, 74, 81, _, 79, 77, 76, 76, 77, 79, 77, _, 74, _, 74, 74, 77, 74, 81, _, 84, 81, 79, 77, 76, 73, 74, _, _, _],
    bass:   [38, 38, 50, 38, 46, 46, 58, 46, 43, 43, 55, 43, 45, 45, 57, 45, 38, 38, 50, 38, 46, 46, 58, 46, 43, 43, 55, 43, 45, _, 45, _] },
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let current: TrackId | null = null;
let timer: number | undefined;
let step = 0;
let nextTime = 0;
let noise: AudioBuffer | null = null;

const freq = (n: number) => 440 * 2 ** ((n - 69) / 12);

function ensure(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.07; // 効果音より小さめ
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    return ctx;
  } catch { return null; }
}

function note(n: number, t: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq(n), t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function hat(t: number) {
  if (!ctx || !master || !noise) return;
  const s = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  s.buffer = noise;
  f.type = 'highpass';
  f.frequency.value = 7000;
  g.gain.value = 0.35;
  s.connect(f).connect(g).connect(master);
  s.start(t);
}

function schedule() {
  if (!ctx || !current) return;
  const tr = TRACKS[current];
  const len = 60 / tr.bpm / 2; // 8分音符
  while (nextTime < ctx.currentTime + 0.25) {
    const i = step % tr.melody.length;
    const m = tr.melody[i];
    const b = tr.bass[i];
    if (m !== null) note(m, nextTime, len * 1.8, tr.lead, tr.lead === 'square' ? 0.25 : 0.6);
    if (b !== null) note(b, nextTime, len * 1.9, 'sine', 0.8);
    if (tr.hat && i % 2 === 1) hat(nextTime);
    nextTime += len;
    step++;
  }
}

function stop() {
  window.clearInterval(timer);
  timer = undefined;
}

function start() {
  const a = ensure();
  if (!a || !current || !enabled) return;
  if (a.state === 'suspended') void a.resume();
  if (timer !== undefined) return;
  nextTime = a.currentTime + 0.1;
  timer = window.setInterval(schedule, 60);
}

/** 画面に合わせて曲を切りかえる（null で止める） */
export function playMusic(id: TrackId | null) {
  if (id === current) { if (id) start(); return; }
  current = id;
  step = 0;
  stop();
  if (id && enabled && ctx && ctx.state === 'running') start();
}

export function setMusicEnabled(v: boolean) {
  enabled = v;
  if (!v) stop();
  else start();
}

// ブラウザは操作があるまで音を出せないので、最初のタップで鳴らし始める
if (typeof window !== 'undefined') {
  const kick = () => { start(); };
  window.addEventListener('pointerdown', kick, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stop(); void ctx?.suspend(); }
    else if (enabled && current) { void ctx?.resume(); start(); }
  });
}

export const TRACK_IDS = Object.keys(TRACKS) as TrackId[];
export const trackOf = (id: TrackId) => TRACKS[id];
