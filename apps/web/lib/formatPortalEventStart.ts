/**
 * US Eastern wall clock for portal `/events` (list, detail, RSVP emails, reminders).
 * IANA `America/New_York` (handles DST in the instant; user-facing copy uses "EST").
 */
const PORTAL_EVENT_TIMEZONE = "America/New_York";

/** Normalize US Eastern abbreviations so copy reads "EST" year-round. */
function normalizeUsEasternTzSuffix(formatted: string): string {
  return formatted.replace(/\bEDT\b|\bEST\b/g, "EST");
}

/**
 * Resolved IANA timezone for portal events — always US Eastern.
 */
export function getPortalEventTimezone(): string {
  return PORTAL_EVENT_TIMEZONE;
}

/**
 * Format the scheduled event start for public pages and transactional emails.
 * Always Eastern (`America/New_York`); does not depend on the server default timezone.
 */
export function formatPortalEventStart(date: Date): string {
  return normalizeUsEasternTzSuffix(
    date.toLocaleString("en-US", {
      timeZone: PORTAL_EVENT_TIMEZONE,
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    })
  );
}
