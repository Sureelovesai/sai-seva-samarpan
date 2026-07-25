"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { updateBadgeFromNotificationCount } from "@/lib/badge-api";

/**
 * NotificationBell Component
 * 
 * Shows notification bell icon with unread count badge
 * Displays in navigation/header (web)
 * Also updates PWA app icon badge on mobile (Badging API)
 * 
 * Web: Shows red badge on bell icon
 * PWA (Mobile): Shows number badge on app icon (Android 12+, some iOS)
 */
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();
    
    // Refresh every 10 seconds for more responsive badge updates
    const interval = setInterval(fetchUnreadCount, 10000);
    
    // Listen for notification-read event to refresh badge immediately
    const handleNotificationRead = () => {
      console.log("[NotificationBell] Notification marked as read, refreshing badge");
      fetchUnreadCount();
    };
    window.addEventListener("notification-read", handleNotificationRead);
    
    // Log badge API info for debugging
    console.log("[NotificationBell] Badge API Info:", {
      supported: "setAppBadge" in navigator,
      standalone: (window.navigator as any).standalone === true,
      notificationPermission: typeof window !== 'undefined' && 'Notification' in window ? (window.Notification as any).permission : 'unknown'
    });
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("notification-read", handleNotificationRead);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications/history?unread=true");
      if (!response.ok) return;

      const data = await response.json();
      // API returns { notifications, total, limit, offset }
      const unread = data.notifications?.length || data.total || 0;
      setUnreadCount(unread);

      // Update PWA app icon badge (Badging API)
      // Works on Android 12+ and some iOS versions
      // This will show a number badge on the app icon itself
      await updateBadgeFromNotificationCount(unread);
      console.log(`[NotificationBell] Updated badge to ${unread}`, {
        notificationsArray: data.notifications?.length,
        total: data.total,
        rawData: data
      });

      // Request periodic background sync for Android (to keep badge updated)
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          // Type cast to access sync property which may not be in all TypeScript versions
          const syncReg = registration as any;
          if (syncReg.sync && typeof syncReg.sync.register === 'function') {
            await syncReg.sync.register("sync-badge");
            console.log("[NotificationBell] Requested background sync for badge");
          }
        } catch (err) {
          console.debug("[NotificationBell] Background sync not available:", err);
        }
      }
    } catch (err) {
      console.error("[NotificationBell] Error fetching unread count:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link
      href="/dashboard/notifications"
      className="relative inline-flex items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      title="Notifications"
    >
      {/* Bell Icon */}
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Unread Badge - Made more visible */}
      {!isLoading && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-5 h-5 text-xs font-bold leading-none text-white bg-red-600 rounded-full border-2 border-white dark:border-gray-950 shadow-md">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
