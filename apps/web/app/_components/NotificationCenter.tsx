"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  body: string;
  triggerType: string;
  read: boolean;
  sentAt: string;
  actionUrl?: string;
  relatedId?: string;
}

/**
 * NotificationCenter Component
 * 
 * Shows notification history to users
 * Allows marking notifications as read/unread
 * Shows unread badge count
 */
export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Update unread count
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/notifications/history");
      
      if (response.status === 401) {
        throw new Error("Not authenticated - please log in");
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch notifications");
      }

      const data = await response.json();
      // API returns { notifications, total, limit, offset }
      // Extract notifications array, or fall back to empty array
      setNotifications(data.notifications || data || []);
      setError(null);
    } catch (err) {
      console.error("[NotificationCenter] Error fetching notifications:", err);
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-read", notificationId }),
      });

      if (!response.ok) throw new Error("Failed to mark as read");

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      console.error("[NotificationCenter] Error marking as read:", err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const triggerTypeIcon: Record<string, string> = {
    NEW_ACTIVITY: "🏃",
    NEW_SIGNUP: "✋",
    ACTIVITY_REMINDER: "⏰",
    BLOG_POST: "📝",
    PARTNER_APP: "🤝",
    EVENT_SIGNUP: "🎉",
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-8 h-8 animate-spin">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="mt-2 text-sm text-gray-600">Loading notifications...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchNotifications}
            className="mt-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-600">
            No notifications yet. You'll see them here when you get one.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                notification.read
                  ? "bg-gray-50 border-gray-200 text-gray-600"
                  : "bg-blue-50 border-blue-200 text-gray-900 font-medium"
              } hover:bg-gray-100`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">
                  {triggerTypeIcon[notification.triggerType] || "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {notification.body}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(notification.sentAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
