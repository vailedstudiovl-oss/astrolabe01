// Dimensionlock Astrolabe — Service Worker (v2)
// Strategy:
//   - Precache app shell on install (HTML, icons, key assets)
//   - cache-first for /api/static/* (images, gifs, splash, icons)
//   - network-first w/ cache fallback for /api/astrolabe (so users get latest HTML when online)
//   - stale-while-revalidate for cross-origin CDN assets (Three.js, Tailwind, Google Fonts)
//     so the app launches offline once it has been opened once.

const VERSION       = 'v2-2025-06';
const SHELL_CACHE   = `astrolabe-shell-${VERSION}`;
const RUNTIME_CACHE = `astrolabe-runtime-${VERSION}`;
const CDN_CACHE     = `astrolabe-cdn-${VERSION}`;

const SHELL_ASSETS = [
  '/api/astrolabe',
  '/api/static/manifest.json',
  '/api/static/holo_projector.jpg',
  '/api/static/reality_red.gif',
  '/api/static/reality_violet.gif',
  '/api/static/dlds_splash.png',
  '/api/static/icon-192.png',
  '/api/static/icon-512.png',
  '/api/static/icon-maskable-512.png',
  '/api/static/icon-apple.png',
];

// Hostnames we want to cache cross-origin (stale-while-revalidate).
const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'unpkg.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Allow individual failures so install doesn't break if one asset 404s.
      Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, RUNTIME_CACHE, CDN_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// --- Strategies ---------------------------------------------------------

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      });
    })
  );
}

function networkFirst(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => cache.match(request).then((c) => c || cache.match('/api/astrolabe')))
  );
}

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          // Cache opaque responses too (CDNs without CORS) so they’re still usable offline.
          if (response && (response.status === 200 || response.type === 'opaque')) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
}

// --- Router -------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin CDN assets we explicitly want to cache.
  if (url.origin !== self.location.origin) {
    if (CDN_HOSTS.includes(url.hostname)) {
      event.respondWith(staleWhileRevalidate(request, CDN_CACHE));
    }
    return; // ignore everything else cross-origin
  }

  // Same-origin: only handle requests under /api/
  if (!url.pathname.startsWith('/api/')) return;

  // Static assets
  if (url.pathname.startsWith('/api/static/')) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Astrolabe HTML — network-first, fall back to cache.
  if (url.pathname === '/api/astrolabe' || url.pathname.startsWith('/api/astrolabe')) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  // Anything else under /api/ — runtime stale-while-revalidate (e.g. future API calls).
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

// Allow page to trigger immediate activation (used after deploy).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
