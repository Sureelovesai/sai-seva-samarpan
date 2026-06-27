import { prisma } from "./prisma";
import { sendNotificationToLocation } from "./notification-service";

/**
 * Send activity reminders to volunteers and coordinators
 * Called by cron job to send:
 * - 24 hours before activity
 * - 12 hours before activity
 * - 1 hour before activity
 */

interface ReminderResult {
  total: number;
  sent24h: number;
  sent12h: number;
  sent1h: number;
  errors: number;
}

export async function sendActivityReminders(): Promise<ReminderResult> {
  const result: ReminderResult = {
    total: 0,
    sent24h: 0,
    sent12h: 0,
    sent1h: 0,
    errors: 0,
  };

  try {
    const now = new Date();
    
    // Get all active published activities with start dates
    const activities = await prisma.sevaActivity.findMany({
      where: {
        status: "PUBLISHED",
        isActive: true,
        startDate: { not: null },
      },
      select: {
        id: true,
        title: true,
        city: true,
        startDate: true,
        reminderSentAt: true,
      },
    });

    result.total = activities.length;

    for (const activity of activities) {
      try {
        if (!activity.startDate) continue;

        const timeUntilStart = activity.startDate.getTime() - now.getTime();
        const hoursUntilStart = timeUntilStart / (1000 * 60 * 60);

        // Send 24-hour reminder (between 23.5 and 24.5 hours before)
        if (hoursUntilStart >= 23.5 && hoursUntilStart < 24.5) {
          await sendLocationReminder(
            activity.city,
            activity.title,
            activity.id,
            "24 hours",
            "ACTIVITY_REMINDER"
          );
          result.sent24h++;
          continue; // Skip other reminders for this activity
        }

        // Send 12-hour reminder (between 11.5 and 12.5 hours before)
        if (hoursUntilStart >= 11.5 && hoursUntilStart < 12.5) {
          await sendLocationReminder(
            activity.city,
            activity.title,
            activity.id,
            "12 hours",
            "ACTIVITY_REMINDER"
          );
          result.sent12h++;
          continue;
        }

        // Send 1-hour reminder (between 0.5 and 1.5 hours before)
        if (hoursUntilStart >= 0.5 && hoursUntilStart < 1.5) {
          await sendLocationReminder(
            activity.city,
            activity.title,
            activity.id,
            "1 hour",
            "ACTIVITY_REMINDER"
          );
          result.sent1h++;
          continue;
        }
      } catch (error) {
        console.error(`[Reminder] Failed to send reminder for activity ${activity.id}:`, error);
        result.errors++;
      }
    }

    console.log(`[Reminder] Summary: 24h=${result.sent24h}, 12h=${result.sent12h}, 1h=${result.sent1h}, errors=${result.errors}`);
    return result;
  } catch (error) {
    console.error("[Reminder] Failed to send activity reminders:", error);
    throw error;
  }
}

/**
 * Send reminder to volunteers and coordinators in a specific city
 */
async function sendLocationReminder(
  city: string,
  activityTitle: string,
  activityId: string,
  timeBeforeStart: string,
  triggerType: string
): Promise<void> {
  try {
    // Send to both volunteers and coordinators in this city
    await Promise.all([
      sendNotificationToLocation(
        [city],
        {
          title: `Reminder: ${activityTitle} starts in ${timeBeforeStart}`,
          body: `Your seva activity starts ${timeBeforeStart}. Don't miss it!`,
          triggerType,
          relatedId: activityId,
          actionUrl: `/find-seva`,
        },
        "VOLUNTEER"
      ),
      sendNotificationToLocation(
        [city],
        {
          title: `Reminder: ${activityTitle} starts in ${timeBeforeStart}`,
          body: `Your coordinated activity starts ${timeBeforeStart}. Activity details are in your dashboard.`,
          triggerType,
          relatedId: activityId,
          actionUrl: `/admin/seva-dashboard`,
        },
        "SEVA_COORDINATOR"
      ),
    ]);

    console.log(`[Reminder] Sent ${timeBeforeStart} reminder for ${activityTitle} in ${city}`);
  } catch (error) {
    console.error(`[Reminder] Failed to send reminder for ${activityTitle}:`, error);
    throw error;
  }
}
