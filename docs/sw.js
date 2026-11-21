/* PUG REVERSI Service Worker (自動生成) */
const VERSION = "1.0.0-jtjd9s";
const PREFIX = 'pug-reversi-';
const CACHE = PREFIX + VERSION;
const PRECACHE = ["./","./assets/AchievementScreen-DCY7idZI.js","./assets/ChallengeScreen-DiNiDwrK.js","./assets/CupScreen-BfSByAoG.js","./assets/DressScreen--ekf_Z-F.js","./assets/GardenScreen-cMKUUdN_.js","./assets/IkuseiScreen-CuUo4T4G.js","./assets/MissionScreen-DO0u-hIB.js","./assets/ProfileScreen-BahaVPaE.js","./assets/SettingsScreen-CsWijIip.js","./assets/StatsScreen-DvRXJ9ai.js","./assets/ZukanScreen-BPxrVN-U.js","./assets/ai.worker-D6ZwAaX3.js","./assets/conditions-C__t7bVm.js","./assets/index-D8WXGdZk.css","./assets/index-DeD1NA1n.js","./favicon.svg","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/icon.svg","./index.html","./manifest.webmanifest"];

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
