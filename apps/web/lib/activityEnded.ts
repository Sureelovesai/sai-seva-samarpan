/**
 * Helpers for "activity has ended" logic.
 * Hours and volunteer counts from Join Seva signups are only counted after the scheduled activity has finished.
 */

export type ActivityDateFields = {
  endDate?: Date | string | null;
  startDate?: Date | string | null;
  endTime?: string | null;
  startTime?: string | null;
  durationHours?: number | null;
};

/**
 * Returns the end moment of the activity (for comparison with now), or null if not determinable.
 */
export function getActivityEndMoment(activity: ActivityDateFields): Date | null {
  if (activity.endDate) {
    const d = new Date(activity.endDate);
    if (activity.endTime && typeof activity.endTime === "string") {
      const parts = activity.endTime.trim().split(":");
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      d.setHours(h, m, 0, 0);
    } else {
      d.setHours(23, 59, 59, 999);
    }
    return d;
  }
  if (activity.startDate != null && typeof activity.durationHours === "number" && activity.durationHours >= 0) {
    const d = new Date(activity.startDate);
    if (activity.startTime && typeof activity.startTime === "string") {
      const parts = activity.startTime.trim().split(":");
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      d.setHours(h, m, 0, 0);
    }
    d.setTime(d.getTime() + activity.durationHours * 60 * 60 * 1000);
    return d;
  }
  if (activity.startDate) {
    const d = new Date(activity.startDate);
    d.setHours(23, 59, 59, 999);
    return d;
  }
  return null;
}

/**
 * True if the activity's scheduled end is in the past (activity is finished).
 * Only then should signup hours and volunteer count be included in stats.
 */
export function isActivityEnded(activity: ActivityDateFields): boolean {
  const end = getActivityEndMoment(activity);
  return end != null && end.getTime() <= Date.now();
}

const REJECTED = "REJECTED";
const CANCELLED = "CANCELLED";

/**
 * Whether a signup should count toward hours/volunteers.
 * - When the activity has NOT ended: exclude CANCELLED and REJECTED (don't count no-shows or rejected).
 * - When the activity HAS ended: only exclude REJECTED. Count CANCELLED so that if a signup or
 *   activity is cancelled after the event, we do not lose the hours/volunteer count.
 */
export function isSignupCounted(
  status: string | null | undefined,
  activityEnded?: boolean
): boolean {
  if (!status) return true;
  const u = status.toUpperCase();
  if (activityEnded) {
    return u !== REJECTED; // after activity ended, count everyone except REJECTED (never participated)
  }
  return u !== CANCELLED && u !== REJECTED; // before end, don't count cancelled or rejected
}
