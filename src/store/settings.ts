/**
 * 設定の保存（端末の localStorage。バックアップファイルにも一緒に入る）
 */
import { useEffect, useState } from 'react';

export interface Settings {
  sound: boolean;
  /** BGM */
  music: boolean;
  showLegal: boolean;
  animation: boolean;
}

const KEY = 'pug-reversi:settings:v1';
const DEFAULTS: Settings = { sound: true, music: true, showLegal: true, animation: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? { ...DEFAULTS, ...v } : DEFAULTS;
  } catch { return DEFAULTS; }
}

export function useSettings() {
  const [s, set] = useState<Settings>(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 保存不可でも続行 */ }
  }, [s]);
  return [s, (patch: Partial<Settings>) => set((prev) => ({ ...prev, ...patch }))] as const;
}
