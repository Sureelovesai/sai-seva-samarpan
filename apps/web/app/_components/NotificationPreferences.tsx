"use client";

import { useEffect, useState } from "react";

interface Preferences {
  newActivityNotifications: boolean;
  signupNotifications: boolean;
  reminderNotifications: boolean;
  blogNotifications: boolean;
  communityOutreachNotifications: boolean;
  eventNotifications: boolean;
}

/**
 * NotificationPreferences Component
 * 
 * Allows users to customize which types of notifications they receive
 * Syncs with backend API
 */
export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/notifications/preferences");
      
      if (response.status === 401) {
        throw new Error("Not authenticated - please log in");
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch preferences");
      }

      const data = await response.json();
      setPreferences(data);
      setError(null);
    } catch (err) {
      console.error("[NotificationPreferences] Error fetching:", err);
      setError(err instanceof Error ? err.message : "Failed to load preferences");
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    if (!preferences) return;

    const updatedPrefs = { ...preferences, [key]: value };
    setPreferences(updatedPrefs);

    try {
      setIsSaving(true);
      const response = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPrefs),
      });

      if (!response.ok) throw new Error("Failed to update preferences");

      setSuccessMessage("Preferences updated!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("[NotificationPreferences] Error updating:", err);
      setError("Failed to update preferences");
      // Revert on error
      fetchPreferences();
    } finally {
      setIsSaving(false);
    }
  };

  const preferencesList = [
    {
      key: "newActivityNotifications" as const,
      label: "New Activities",
      description: "Get notified when new seva activities are created",
    },
    {
      key: "signupNotifications" as const,
      label: "New Signups",
      description: "Get notified when volunteers sign up for activities",
    },
    {
      key: "reminderNotifications" as const,
      label: "Activity Reminders",
      description: "Get reminders 24h, 12h, and 1h before activities start",
    },
    {
      key: "blogNotifications" as const,
      label: "Blog Posts",
      description: "Get notified when new blog posts are published",
    },
    {
      key: "communityOutreachNotifications" as const,
      label: "Community Outreach",
      description: "Get notified about new partner organizations",
    },
    {
      key: "eventNotifications" as const,
      label: "Events",
      description: "Get notified when users sign up for events",
    },
  ];

  if (isLoading) {
    return (
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
        <p className="mt-2 text-sm text-gray-600">Loading preferences...</p>
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchPreferences}
          className="mt-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Notification Preferences</h2>
        <p className="text-sm text-gray-600 mt-1">
          Choose which notifications you'd like to receive
        </p>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {preferencesList.map(({ key, label, description }) => (
          <label key={key} className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences[key]}
              onChange={(e) => updatePreference(key, e.target.checked)}
              disabled={isSaving}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="ml-3 flex-1">
              <p className="font-medium text-gray-900">{label}</p>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Even if a notification type is disabled, you'll still see it in your notification history, but you won't receive push notifications for it.
        </p>
      </div>
    </div>
  );
}
