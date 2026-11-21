/**
 * PWA まわり（Service Worker の登録・更新、ホーム画面への追加、オフライン状態、保存領域）
 * どの機能も、使えない環境（プレビュー画面・古いブラウザなど）では静かに何もしない。
 */
import { useEffect, useState } from 'react';

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const state = {
  registration: null as ServiceWorkerRegistration | null,
  updateReady: false,
  swVersion: '' as string,
  installEvent: null as BeforeInstallPromptEvent | null,
  installed: false,
  offlineReady: false,
};

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

export function isStandalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch { return false; }
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
}

/** アプリ起動時に1回呼ぶ */
export function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.installEvent = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => { state.installed = true; state.installEvent = null; emit(); });

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      state.registration = reg;
      const watch = (w: ServiceWorker | null) => {
        if (!w) return;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed') {
            if (navigator.serviceWorker.controller) state.updateReady = true; // 新しいバージョンが待機中
            else state.offlineReady = true; // 初回インストール完了
            emit();
          }
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) { state.updateReady = true; emit(); }
      if (navigator.serviceWorker.controller) { state.offlineReady = true; emit(); }
      watch(reg.installing);
      reg.addEventListener('updatefound', () => watch(reg.installing));
      // 起動中もときどき更新を確認（オンラインのときだけ）
      window.setInterval(() => { if (navigator.onLine) void reg.update().catch(() => {}); }, 60 * 60 * 1000);
    }).catch(() => { /* プレビュー画面など、Service Worker が使えない環境 */ });

    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'VERSION') { state.swVersion = e.data.version; emit(); }
    });
    navigator.serviceWorker.ready.then((r) => r.active?.postMessage('GET_VERSION')).catch(() => {});
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}

/** 待機中の新しいバージョンに切りかえる（自動で再読み込み） */
export function applyUpdate() {
  const w = state.registration?.waiting;
  if (w) w.postMessage('SKIP_WAITING');
  else window.location.reload();
}

export async function checkForUpdate(): Promise<boolean> {
  try {
    await state.registration?.update();
  } catch { /* オフラインなど */ }
  return state.updateReady;
}

export async function promptInstall(): Promise<boolean> {
  const e = state.installEvent;
  if (!e) return false;
  await e.prompt();
  const r = await e.userChoice;
  state.installEvent = null;
  emit();
  return r.outcome === 'accepted';
}

/** キャッシュを全部消して読み込み直す（表示がおかしいときの最終手段。セーブデータは消えない） */
export async function clearCachesAndReload() {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('pug-reversi-')).map((k) => caches.delete(k)));
    await state.registration?.unregister();
  } catch { /* 使えない環境 */ }
  window.location.reload();
}

/** 保存領域を「消されにくい」設定にする（対応ブラウザのみ） */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch { return false; }
}

export async function storageInfo(): Promise<{ persisted: boolean; usedKB: number | null }> {
  try {
    const persisted = (await navigator.storage?.persisted?.()) ?? false;
    const est = await navigator.storage?.estimate?.();
    return { persisted, usedKB: est?.usage !== undefined ? Math.round(est.usage / 1024) : null };
  } catch { return { persisted: false, usedKB: null }; }
}

export function usePWA() {
  const [, force] = useState(0);
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { listeners.delete(l); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return {
    online,
    updateReady: state.updateReady,
    offlineReady: state.offlineReady,
    swVersion: state.swVersion,
    canInstall: Boolean(state.installEvent),
    standalone: isStandalone() || state.installed,
    swSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  };
}
