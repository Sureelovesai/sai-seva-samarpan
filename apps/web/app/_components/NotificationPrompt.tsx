"use client";

import { useEffect, useState } from "react";
import { initializeFirebaseClient, requestNotificationPermission, registerFCMToken } from "@/lib/firebase-client";

/**
 * NotificationPrompt Component
 * 
 * Shows a notification permission request to users on app load/login
 * Handles FCM token registration
 * Appears once per session
 */
export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize Firebase immediately
    initializeFirebaseClient();

    // Check if user already dismissed this session
    const dismissed = sessionStorage.getItem("notification_prompt_dismissed");
    if (dismissed) {
      return;
    }

    // Check if notifications already subscribed
    const checkSubscription = async () => {
      try {
        // Don't show if notifications already granted
        if ("Notification" in window && Notification.permission === "granted") {
          // Already subscribed, don't show prompt
          console.log("[NotificationPrompt] Notifications already granted");
          return;
        }

        // Show prompt after 2 seconds delay (better UX)
        setTimeout(() => {
          setShowPrompt(true);
        }, 2000);
      } catch (error) {
        console.error("[NotificationPrompt] Error checking subscription:", error);
      }
    };

    checkSubscription();
  }, []);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      // Request permission and get token
      const token = await requestNotificationPermission();

      if (token) {
        console.log("[NotificationPrompt] Token received, registering with backend...");
        // Register token with backend
        const registered = await registerFCMToken(token);
        console.log("[NotificationPrompt] Registration response:", registered);
        
        // Close prompt and dismiss regardless of registration success
        // (permission was granted, which is the main goal)
        setShowPrompt(false);
        sessionStorage.setItem("notification_prompt_dismissed", "true");
        console.log("[NotificationPrompt] Notifications enabled");
      } else {
        console.log("[NotificationPrompt] Failed to get notification token, but closing prompt");
        // Still close the prompt even if token fetch failed
        setShowPrompt(false);
        sessionStorage.setItem("notification_prompt_dismissed", "true");
      }
    } catch (error) {
      console.error("[NotificationPrompt] Error enabling notifications:", error);
      // Close prompt on error too
      setShowPrompt(false);
      sessionStorage.setItem("notification_prompt_dismissed", "true");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("notification_prompt_dismissed", "true");
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.353-1.008 5.353 1.008a1 1 0 001.169-1.409l-7-14z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Stay Updated</h3>
            <p className="text-sm text-gray-600 mt-1">
              Enable notifications to get reminders about activities and important updates.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Enabling..." : "Enable"}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
