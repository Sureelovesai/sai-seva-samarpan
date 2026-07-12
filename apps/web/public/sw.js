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

// Handle push notifications from Firebase Cloud Messaging
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  if (!event.data) {
    console.log('[SW] No data in push event');
    return;
  }

  try {
    // Parse the push notification data
    const data = event.data.json();
    const { title, body, icon, badge, tag, data: payloadData } = data.notification || {};

    const options = {
      body: body || 'New notification',
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-192x192.png',
      tag: tag || 'notification',
      data: payloadData || {},
      actions: [
        {
          action: 'open',
          title: 'Open',
        },
        {
          action: 'close',
          title: 'Close',
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title || 'Sai Seva', options).then(() => {
        // Update app badge when notification received (PWA app icon)
        // This will show a number badge on the app icon on home screen
        if ('setAppBadge' in self.clients) {
          // Estimate: badge = current badge + 1 (we don't have access to actual count in SW)
          // The client component (NotificationBell) will sync this properly every 30s
          try {
            (self as any).setAppBadge(1); // Just indicate there's at least 1 notification
          } catch (err) {
            console.debug('[SW] Badge API not available');
          }
        }
      })
    );
  } catch (error) {
    console.error('[SW] Error handling push notification:', error);
    event.waitUntil(
      self.registration.showNotification('Sai Seva', {
        body: 'New notification received',
        icon: '/icons/icon-192x192.png',
      })
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  const actionUrl = event.notification.data.actionUrl || '/dashboard';

  // Open the app and navigate to the action URL
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app window already exists
        for (const client of clientList) {
          if (client.url === new URL(actionUrl, self.location.origin).href && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not found
        if (clients.openWindow) {
          return clients.openWindow(actionUrl);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

console.log('[SW] Service Worker loaded');
