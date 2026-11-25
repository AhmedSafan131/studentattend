const CACHE_PREFIX = 'mnu-attend-';
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const withBasePath = (path = '/') => `${BASE_PATH}/${String(path).replace(/^\/+/, '')}`;
const CACHE_NAME = `${CACHE_PREFIX}${BASE_PATH.replace(/[^a-z0-9]+/gi, '-') || 'root'}-v4`;
const APP_SHELL = [
  withBasePath('/student/'),
  withBasePath('/manifest.json'),
  withBasePath('/mnu-attend-192.png'),
  withBasePath('/mnu-attend-512.png'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(APP_SHELL);

        // CRA writes the hashed production bundles here. Pre-caching them is
        // what lets a cold start reach the scanner when the network is down.
        try {
          const response = await fetch(withBasePath('/asset-manifest.json'), { cache: 'no-store' });
          if (!response.ok) return;
          const manifest = await response.json();
          const assets = [...new Set(Object.values(manifest.files || {}))]
            .filter((path) => typeof path === 'string' && path.startsWith('/'));
          if (assets.length) await cache.addAll(assets);
        } catch (_) {
          // Development servers may not expose an asset manifest. The basic
          // shell remains installable and runtime caching still applies.
        }
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith(withBasePath('/api/'))) return;

  if (request.mode === 'navigate') {
    if (!url.pathname.startsWith(withBasePath('/student'))) return;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(withBasePath('/student/'), copy));
          }
          return response;
        })
        .catch(() => caches.match(withBasePath('/student/'))),
    );
    return;
  }

  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});
