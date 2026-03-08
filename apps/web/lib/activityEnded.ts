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
 * Uses the calendar date from the stored value (UTC date parts) and builds the moment in local
 * time so "tomorrow" is not treated as "already ended" in timezones behind UTC.
 */
export function getActivityEndMoment(activity: ActivityDateFields): Date | null {
  if (activity.endDate) {
    const d = new Date(activity.endDate);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    if (activity.endTime && typeof activity.endTime === "string") {
      const parts = activity.endTime.trim().split(":");
      const h = parseInt(parts[0], 10) || 0;
      const min = parseInt(parts[1], 10) || 0;
      return new Date(y, m, day, h, min, 0, 0);
    }
    return new Date(y, m, day, 23, 59, 59, 999);
  }
  if (activity.startDate != null && typeof activity.durationHours === "number" && activity.durationHours >= 0) {
    const d = new Date(activity.startDate);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    let startMs = new Date(y, m, day, 0, 0, 0, 0).getTime();
    if (activity.startTime && typeof activity.startTime === "string") {
      const parts = activity.startTime.trim().split(":");
      const h = parseInt(parts[0], 10) || 0;
      const min = parseInt(parts[1], 10) || 0;
      startMs = new Date(y, m, day, h, min, 0, 0).getTime();
    }
    return new Date(startMs + activity.durationHours * 60 * 60 * 1000);
  }
  if (activity.startDate) {
    const d = new Date(activity.startDate);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    return new Date(y, m, day, 23, 59, 59, 999);
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
