// Simple Service Worker for Sai Seva Portal PWA

const CACHE_NAME = 'sai-seva-v1';

// Install - cache offline page
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching offline.html');
      return cache.add('/offline.html').catch((err) => {
        console.error('[SW] Failed to cache offline.html:', err);
      });
    })
  );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  self.clients.claim();
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
});

// Fetch - simple caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache API auth routes
  if (url.pathname.startsWith('/api/auth/')) {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  // Network first, fallback to offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone BEFORE using
        const clonedResponse = response.clone();
        
        // Cache successful responses in the background
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cached) => {
          if (cached) {
            console.log('[SW] Serving from cache:', request.url);
            return cached;
          }
          // Nothing cached, show offline page
          console.log('[SW] Serving offline page for:', request.url);
          return caches.match('/offline.html');
        });
      })
  );
});

console.log('[SW] Service Worker loaded');
