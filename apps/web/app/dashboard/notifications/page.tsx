import { Suspense } from "react";
import { NotificationCenter } from "@/app/_components/NotificationCenter";
import { NotificationPreferences } from "@/app/_components/NotificationPreferences";

export const metadata = {
  title: "Notifications - Sai Seva Portal",
  description: "Manage your notification preferences and view notification history",
};

/**
 * Notifications Page
 * 
 * Shows:
 * 1. Notification history/inbox
 * 2. Notification preferences/settings
 * 3. Push notification status
 */
export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-2 text-gray-600">
            Stay updated with real-time notifications about activities, signups, and more
          </p>
        </div>

        {/* Push Notification Status */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 pt-0.5">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Push Notifications</h3>
              <p className="text-sm text-blue-800 mt-1">
                Push notifications are enabled. You'll receive notifications about new activities, signups, and updates.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Notification Center - Main Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  📬 Notification History
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  View all your recent notifications
                </p>
              </div>
              <div className="p-6">
                <Suspense
                  fallback={
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
                  }
                >
                  <NotificationCenter />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Preferences - Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow sticky top-6">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  ⚙️ Preferences
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Customize your notifications
                </p>
              </div>
              <div className="p-6">
                <Suspense
                  fallback={
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
                  }
                >
                  <NotificationPreferences />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-2">🔔 Push Notifications</h3>
            <p className="text-sm text-gray-600">
              Receive real-time notifications on your device. Enable in your browser settings.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-2">📱 Multi-Device</h3>
            <p className="text-sm text-gray-600">
              Notifications sync across all your devices where you're logged in.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-2">✏️ Customizable</h3>
            <p className="text-sm text-gray-600">
              Control exactly which types of notifications you want to receive.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
