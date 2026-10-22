// Family budget — offline support and reliable updates.
// The app opens from the phone at once; a fresh copy is always checked in the background,
// and when a new version is installed the open app reloads itself.
const VERSION = 'budget-22';
const FONTS = 'budget-fonts';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the 10-minute GitHub/browser cache, so a new version really is new
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // data requests to the spreadsheet are never cached here
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(caches.open(VERSION).then(async cache => {
      const key = url.pathname.endsWith('/') ? './' : req;
      const hit = await cache.match(key, { ignoreSearch: true });
      const net = fetch(req, { cache: 'no-cache' }).then(res => { if (res && res.ok) cache.put(key, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(FONTS).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }));
  }
});
