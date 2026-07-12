// Firebase Cloud Messaging Service Worker
// Handles background push notifications from Firebase

// Try to import Firebase scripts, but don't fail if they don't load
try {
  importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
  importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js');
  
  console.log('[Firebase SW] Firebase scripts loaded');
  
  // Initialize Firebase in Service Worker
  // Use minimal config - full config not needed for SW
  const firebaseConfig = {
    projectId: 'sai-seva-portal',
  };

  try {
    if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.log('[Firebase SW] Firebase initialized');
    }
    
    if (typeof firebase !== 'undefined' && typeof firebase.messaging === 'function') {
      const messaging = firebase.messaging();
      
      // Handle background messages
      messaging.onBackgroundMessage((payload) => {
        console.log('[Firebase SW] Received background message:', payload);

        const notificationTitle = payload.notification?.title || 'Sai Seva';
        const notificationOptions = {
          body: payload.notification?.body || 'New notification',
          icon: payload.notification?.icon || '/icons/icon-192x192.png',
          badge: payload.notification?.badge || '/icons/icon-192x192.png',
          tag: payload.data?.tag || 'notification',
          data: payload.data || {},
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

        return self.registration.showNotification(notificationTitle, notificationOptions);
      });
      
      console.log('[Firebase SW] Background message handler registered');
    }
  } catch (initError) {
    console.warn('[Firebase SW] Firebase initialization warning:', initError.message);
  }
} catch (importError) {
  console.warn('[Firebase SW] Firebase import warning:', importError.message);
}

// Handle notification click (this works even without Firebase)
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase SW] Notification clicked:', event.action);
  event.notification.close();

  const urlToOpen = event.notification.data?.actionUrl || '/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab with the target URL
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Firebase SW] Notification closed');
});

// Handle push events as fallback (in case Firebase doesn't work)
self.addEventListener('push', (event) => {
  console.log('[Firebase SW] Push event:', event);
  
  if (!event.data) {
    console.log('[Firebase SW] No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    const notification = data.notification || {};
    
    const options = {
      body: notification.body || 'New notification',
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: notification.badge || '/icons/icon-192x192.png',
      tag: notification.tag || 'notification',
      data: data.data || notification || {},
    };

    event.waitUntil(
      self.registration.showNotification(notification.title || 'Sai Seva', options)
    );
  } catch (error) {
    console.warn('[Firebase SW] Error handling push event:', error);
  }
});

console.log('[Firebase SW] Service Worker loaded successfully');
