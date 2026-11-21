/**
 * Service Worker の中身を作る（ビルド時に vite.config.ts から呼ぶ）
 * - インストール時にアプリ一式をキャッシュ（オフラインで遊べる）
 * - 古いバージョンのキャッシュは有効化時に削除（キャッシュ管理）
 * - 画面遷移は index.html をキャッシュから返す（オフラインでも起動）
 * - アプリから 'SKIP_WAITING' が届いたら新しいバージョンに切りかえ
 */
export function buildServiceWorker(files: string[], version: string): string {
  const precache = ['./', ...[...new Set(files)].filter((f) => f !== 'sw.js').sort().map((f) => `./${f}`)];
  return `/* PUG REVERSI Service Worker (自動生成) */
const VERSION = ${JSON.stringify(version)};
const PREFIX = 'pug-reversi-';
const CACHE = PREFIX + VERSION;
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'GET_VERSION' && e.source) e.source.postMessage({ type: 'VERSION', version: VERSION });
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
        .then((hit) => hit || fetch(req))
        .catch(() => caches.match('./', { ignoreSearch: true })),
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
`;
}

/** ファイル一覧からバージョン文字列を作る（中身が変わればファイル名のハッシュが変わる） */
export function versionOf(files: string[]): string {
  let h = 2166136261;
  for (const ch of [...files].sort().join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}
