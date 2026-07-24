import { firebaseMessaging } from "./firebase-admin";
import { prisma } from "./prisma";
import type { AppRole } from "./getRole";

export interface NotificationPayload {
  title: string;
  body: string;
  triggerType: string;
  relatedId?: string;
  actionUrl?: string;
}

/**
 * Send notification to a specific user
 */
export async function sendNotificationToUser(
  userId: string,
  payload: NotificationPayload,
  checkPreference: boolean = true
): Promise<void> {
  try {
    // Check user preferences if requested
    if (checkPreference) {
      const prefs = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      // Default to true if no preferences set
      if (prefs) {
        const prefsEnabled = getPreferenceForTrigger(prefs, payload.triggerType);
        if (!prefsEnabled) {
          console.log(`[Notification] Skipped - user preferences disabled for ${payload.triggerType}`);
          return;
        }
      }
    }

    // Get all FCM tokens for this user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
    });

    if (subscriptions.length === 0) {
      console.log(`[Notification] No active subscriptions for user ${userId}`);
      // Still log the notification even if no device subscribed
      await logNotification(userId, payload);
      return;
    }

    const tokens = subscriptions.map((s: any) => s.fcmToken);

    // Send notification via FCM
    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        triggerType: payload.triggerType,
        relatedId: payload.relatedId || "",
        actionUrl: payload.actionUrl || "/",
      },
    };

    // Send to all devices
    const messagingInstance = firebaseMessaging();
    if (!messagingInstance) {
      console.error("[Notification] Firebase not initialized");
      await logNotification(userId, payload);
      return;
    }

    const response = await messagingInstance.sendMulticast({
      ...message,
      tokens,
    });

    console.log(`[Notification] Sent to ${response.successCount}/${tokens.length} devices`);

    // Log the notification
    await logNotification(userId, payload);
  } catch (error) {
    console.error(`[Notification] Failed to send to user ${userId}:`, error);
    throw error;
  }
}

/**
 * Send notification to all users with a specific role
 */
export async function sendNotificationToRole(
  role: AppRole,
  payload: NotificationPayload,
  filters?: {
    cities?: string[];
    excludeUserIds?: string[];
  }
): Promise<number> {
  try {
    // Get all users with this role
    const roleAssignments = await prisma.roleAssignment.findMany({
      where: { role },
    });

    let targetEmails = roleAssignments.map((r: any) => r.email);

    // Filter by cities if provided (for coordinators)
    if (filters?.cities && filters.cities.length > 0) {
      targetEmails = roleAssignments
        .filter((r: any) => {
          if (!r.cities) return false;
          const userCities = r.cities.split(",").map((c: string) => c.trim());
          return userCities.some((c: string) => filters.cities!.includes(c));
        })
        .map((r: any) => r.email);
    }

    // Exclude specific users
    if (filters?.excludeUserIds && filters.excludeUserIds.length > 0) {
      const usersToExclude = await prisma.user.findMany({
        where: { id: { in: filters.excludeUserIds } },
        select: { email: true },
      });
      const excludeEmails = usersToExclude.map((u: any) => u.email);
      targetEmails = targetEmails.filter((e: string) => !excludeEmails.includes(e));
    }

    // Get user IDs from emails
    const users = await prisma.user.findMany({
      where: { email: { in: targetEmails } },
      select: { id: true },
    });

    console.log(`[Notification] Sending to ${users.length} users with role ${role}`);

    // Send to each user
    let successCount = 0;
    for (const user of users) {
      try {
        await sendNotificationToUser(user.id, payload, true);
        successCount++;
      } catch (error) {
        console.error(`[Notification] Failed for user ${user.id}:`, error);
      }
    }

    return successCount;
  } catch (error) {
    console.error(`[Notification] Failed to send to role ${role}:`, error);
    throw error;
  }
}

/**
 * Send notification to users in specific location/cities
 */
export async function sendNotificationToLocation(
  cities: string[],
  payload: NotificationPayload,
  role?: AppRole
): Promise<number> {
  try {
    let query: any = {
      location: { in: cities, mode: "insensitive" },
    };

    // If role specified, only target users with that role in those cities
    if (role) {
      const roleAssignments = await prisma.roleAssignment.findMany({
        where: { role },
      });

      const targetEmails = roleAssignments
        .filter((r: any) => {
          if (!r.cities) return false;
          const userCities = r.cities.split(",").map((c: string) => c.trim());
          return userCities.some((c: string) => cities.includes(c));
        })
        .map((r: any) => r.email);

      query = {
        email: { in: targetEmails },
      };
    }

    const users = await prisma.user.findMany({
      where: query,
      select: { id: true },
    });

    console.log(`[Notification] Sending to ${users.length} users in cities: ${cities.join(", ")}`);

    let successCount = 0;
    for (const user of users) {
      try {
        await sendNotificationToUser(user.id, payload, true);
        successCount++;
      } catch (error) {
        console.error(`[Notification] Failed for user ${user.id}:`, error);
      }
    }

    return successCount;
  } catch (error) {
    console.error(`[Notification] Failed to send to location:`, error);
    throw error;
  }
}

/**
 * Log notification to database for history/audit
 */
async function logNotification(userId: string, payload: NotificationPayload): Promise<void> {
  try {
    console.log(`[Notification] Logging notification - actionUrl: ${payload.actionUrl}`);
    await prisma.notificationLog.create({
      data: {
        userId,
        title: payload.title,
        body: payload.body,
        triggerType: payload.triggerType,
        relatedId: payload.relatedId,
        actionUrl: payload.actionUrl,
      },
    });
  } catch (error) {
    console.error(`[Notification] Failed to log notification:`, error);
  }
}

/**
 * Get user preference for a trigger type
 */
function getPreferenceForTrigger(
  prefs: {
    newActivityNotifications: boolean;
    signupNotifications: boolean;
    reminderNotifications: boolean;
    blogNotifications: boolean;
    communityOutreachNotifications: boolean;
    eventNotifications: boolean;
  },
  triggerType: string
): boolean {
  const triggerMap: Record<string, keyof typeof prefs> = {
    NEW_ACTIVITY: "newActivityNotifications",
    NEW_SIGNUP: "signupNotifications",
    ACTIVITY_REMINDER: "reminderNotifications",
    EVENT_REMINDER: "reminderNotifications",
    BLOG_POST: "blogNotifications",
    BLOG_COMMENT: "blogNotifications",
    PARTNER_APP: "communityOutreachNotifications",
    EVENT_SIGNUP: "eventNotifications",
  };

  const prefKey = triggerMap[triggerType];
  return prefKey ? prefs[prefKey] : true; // Default to true if unknown type
}
