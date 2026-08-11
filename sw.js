const CACHE_NAME    = 'wafacard-v1';
const SHELL_ASSETS  = [
  '/Loyalty/',
  '/Loyalty/index.html',
  '/Loyalty/manifest.json',
  '/Loyalty/icons/icon-192.png',
  '/Loyalty/icons/icon-512.png'
];

// ── INSTALL — cache the app shell ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE — clean up old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH — serve from cache, fall back to network ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept Firebase, Google APIs, or CDN requests
  // Let them always go to the network
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('cdnjs') ||
    url.hostname.includes('unpkg') ||
    url.hostname.includes('jsdelivr') ||
    url.hostname.includes('fonts.googleapis') ||
    url.hostname.includes('fonts.gstatic')
  ) {
    return; // Let the browser handle it normally
  }

  // For app shell requests — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache successful GET responses for same-origin requests
        if (
          response.ok &&
          event.request.method === 'GET' &&
          url.origin === self.location.origin
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return the cached home page
        return caches.match('/Loyalty/index.html');
      });
    })
  );
});
