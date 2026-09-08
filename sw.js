const CACHE_NAME = 'linkstory-reader-v4';
const APP_SHELL = [
  './reader.html',
  './reader.html?app=reader',
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
  const url = new URL(request.url);
  const referrer = request.referrer || '';
  const isReaderNavigation = request.mode === 'navigate' && url.pathname.endsWith('/reader.html');
  const isReaderResource = /\/reader\.html(?:[?#]|$)/.test(referrer) && url.origin === self.location.origin;
  const isReaderShellResource = url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('/brand.js') || url.pathname.endsWith('/linkstory-wordmark.svg');

  if (!isReaderNavigation && !isReaderResource && !isReaderShellResource) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('./reader.html?app=reader').then(app => app || caches.match('./reader.html'));
        }
        return new Response('', {status: 503, statusText: 'Offline'});
      });
    })
  );
});
