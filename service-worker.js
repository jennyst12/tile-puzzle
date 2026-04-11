const CACHE_NAME = 'tile-puzzle-v2';
const BASE = '/tile-puzzle/';
const urlsToCache = [
  BASE,
  BASE + 'index.html',
  BASE + 'puzzle.css',
  BASE + 'puzzle.js',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
