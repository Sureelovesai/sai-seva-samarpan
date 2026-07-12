"use client";

import { useEffect } from "react";
import { subscribeToPushMessages } from "@/lib/firebase-client";

/**
 * ForegroundNotificationListener Component
 * 
 * Listens for foreground push notifications and displays them
 * Only works when app is in focus/foreground
 */
export function ForegroundNotificationListener() {
  useEffect(() => {
    const unsubscribe = subscribeToPushMessages((payload) => {
      console.log("[ForegroundNotification] Message received in foreground:", payload);

      const { notification, data } = payload;
      
      if (notification) {
        // Show a custom notification UI or use browser notification API
        const title = notification.title || "Sai Seva";
        const options = {
          body: notification.body || "New notification",
          icon: notification.icon || "/icons/icon-192x192.png",
          badge: notification.badge || "/icons/icon-192x192.png",
          tag: data?.tag || "notification",
          data: data || {},
        };

        // Show browser notification for foreground messages
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, options);
        }
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return null;
}
