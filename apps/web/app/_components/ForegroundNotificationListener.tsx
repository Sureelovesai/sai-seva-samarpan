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
    try {
      const unsubscribe = subscribeToPushMessages((payload) => {
        try {
          console.log("[ForegroundNotification] Message received in foreground:", payload);

          // Safely extract notification and data
          const notification = payload?.notification;
          const data = payload?.data;
          
          if (notification && typeof notification === 'object') {
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
            if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === "granted") {
              try {
                new window.Notification(title, options);
              } catch (notifErr) {
                console.error("[ForegroundNotification] Error creating notification:", notifErr);
              }
            }
          }
        } catch (err) {
          console.error("[ForegroundNotification] Error handling message:", err);
        }
      });

      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          try {
            unsubscribe();
          } catch (unsubErr) {
            console.error("[ForegroundNotification] Error unsubscribing:", unsubErr);
          }
        }
      };
    } catch (err) {
      console.error("[ForegroundNotification] Error subscribing to messages:", err);
    }
  }, []);

  return null;
}
