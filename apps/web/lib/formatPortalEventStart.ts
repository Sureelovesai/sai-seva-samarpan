const DEFAULT_EVENT_TIMEZONE = "America/New_York";

/**
 * Format the scheduled event start for public pages. Uses `NEXT_PUBLIC_EVENT_TIMEZONE`
 * (IANA, e.g. America/New_York) so the wall-clock time does not depend on the deployment
 * server's default timezone (often UTC on Vercel), which otherwise looks like the "wrong" time
 * compared to what organizers entered.
 */
export function formatPortalEventStart(date: Date): string {
  const tz = process.env.NEXT_PUBLIC_EVENT_TIMEZONE?.trim() || DEFAULT_EVENT_TIMEZONE;
  try {
    return date.toLocaleString("en-US", {
      timeZone: tz,
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return date.toLocaleString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }
}
