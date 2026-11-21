/**
 * Web Audio API で合成する効果音（音声ファイル不要・オフラインで動作）。
 * BGM は music.ts。
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) { enabled = v; }

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slideTo?: number) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  place() { tone(520, 0, 0.09, 'triangle', 0.22, 300); },
  flip(n: number) { for (let i = 0; i < Math.min(n, 8); i++) tone(880 + i * 60, 0.05 + i * 0.05, 0.06, 'sine', 0.07); },
  tap() { tone(700, 0, 0.05, 'sine', 0.1); },
  /** パグの「わふっ」 */
  bark() { tone(420, 0, 0.08, 'sawtooth', 0.08, 260); tone(380, 0.1, 0.1, 'sawtooth', 0.07, 220); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle', 0.18)); },
  lose() { [440, 392, 349, 294].forEach((f, i) => tone(f, i * 0.16, 0.28, 'triangle', 0.14)); },
  hint() { tone(1200, 0, 0.12, 'sine', 0.1, 1600); },
};
