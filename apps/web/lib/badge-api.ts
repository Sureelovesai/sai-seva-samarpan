/**
 * PWA Badging API Utility
 * 
 * Manages the app icon badge (number shown on PWA app icon on home screen)
 * Works on Android 12+, Chrome, and some iOS implementations
 * 
 * Visual examples:
 * - Shows "5" badge when 5 unread notifications
 * - Shows "99+" badge when 99+ unread notifications
 * - No badge when 0 unread notifications
 */

/**
 * Set the app badge with the given count
 * @param count - Number of unread items (will be capped at 99)
 */
export async function setAppBadge(count: number): Promise<void> {
  try {
    if ("setAppBadge" in navigator) {
      const badgeValue = Math.min(count, 99); // Cap at 99 per Badging API convention
      await (navigator as any).setAppBadge(badgeValue);
      console.log(`[BadgeAPI] Set badge to ${badgeValue}`);
    }
  } catch (err) {
    console.debug("[BadgeAPI] setAppBadge not supported or failed:", err);
  }
}

/**
 * Clear the app badge (remove the number from app icon)
 */
export async function clearAppBadge(): Promise<void> {
  try {
    if ("clearAppBadge" in navigator) {
      await (navigator as any).clearAppBadge();
      console.log("[BadgeAPI] Badge cleared");
    }
  } catch (err) {
    console.debug("[BadgeAPI] clearAppBadge not supported or failed:", err);
  }
}

/**
 * Update badge based on unread notification count
 * Auto-clears badge if count is 0
 */
export async function updateBadgeFromNotificationCount(count: number): Promise<void> {
  if (count > 0) {
    await setAppBadge(count);
  } else {
    await clearAppBadge();
  }
}

/**
 * Check if Badging API is supported
 */
export function isBadgingAPISupported(): boolean {
  return "setAppBadge" in navigator;
}
