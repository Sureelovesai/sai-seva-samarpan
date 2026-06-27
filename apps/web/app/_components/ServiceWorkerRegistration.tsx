'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          console.log('[App] Service Worker registered:', registration);
        } catch (error) {
          console.error('[App] Service Worker registration failed:', error);
        }
      });
    }
  }, []);

  return null;
}
