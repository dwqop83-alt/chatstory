const CACHE = 'chatstory-v2';
const ASSETS = ['./manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('index.html') || e.request.url.endsWith('/') || e.request.url.includes('api/')) {
    return; // Always go to network for index.html and API
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
