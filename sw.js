const CACHE_NAME = 'linkstory-reader-v2';
const APP_SHELL = [
  './reader.html',
  './manifest.json',
  './brand.js?v=4',
  './assets/linkstory-wordmark.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const request = event.request;
  const isReaderAsset = request.destination === 'image' || request.destination === 'font' || request.destination === 'style' || request.destination === 'script' || request.mode === 'navigate';

  if (!isReaderAsset) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (!response) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match('./reader.html');
        return new Response('', {status: 503, statusText: 'Offline'});
      });
    })
  );
});
