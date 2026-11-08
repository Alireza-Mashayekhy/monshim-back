import { pwaConfig } from '@/lib/pwa/config';

// Served at the origin root so its scope includes both public and private routes.
// The worker has no runtime cache: everything not explicitly listed is network-only.
export function GET() {
  const policy = JSON.stringify(pwaConfig.workerPolicy);
  const worker = `
const POLICY = ${policy};
const PREFIX = 'monshiim-pwa-';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(POLICY.cacheName);
    for (const path of POLICY.assets) {
      const response = await fetch(path, { credentials: 'omit', cache: 'reload', redirect: 'error' });
      if (!response.ok || response.type !== 'basic') throw new Error('Unable to precache ' + path);
      await cache.put(path, response);
    }
    // No skipWaiting: a new version waits until old clients close, avoiding mid-flow reloads.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== POLICY.cacheName).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(POLICY.cacheName);
      return (await cache.match(POLICY.offlineUrl)) || Response.error();
    }));
    return;
  }
  if (url.search || !POLICY.assets.includes(url.pathname)) return;
  event.respondWith(caches.open(POLICY.cacheName).then(cache => cache.match(url.pathname)).then(response => response || fetch(request)));
});
`;
  return new Response(worker, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
}
