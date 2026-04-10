/** Default length for Google Calendar / ICS when the event has only a start time. */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

function toGcalUtcCompact(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildGoogleCalendarTemplateUrl(params: {
  title: string;
  startsAt: Date;
  venue: string;
  description: string;
  durationMs?: number;
}): string {
  const end = new Date(params.startsAt.getTime() + (params.durationMs ?? DEFAULT_DURATION_MS));
  const dates = `${toGcalUtcCompact(params.startsAt)}/${toGcalUtcCompact(end)}`;
  const text = encodeURIComponent(params.title);
  const details = encodeURIComponent(params.description.slice(0, 8000));
  const location = encodeURIComponent(params.venue.slice(0, 1000));
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}

/**
 * ICS with 24h and 1h display alarms (honored by many clients when imported).
 */
export function buildEventIcs(params: {
  uid: string;
  title: string;
  startsAt: Date;
  venue: string;
  description: string;
  durationMs?: number;
  url?: string;
}): string {
  const end = new Date(params.startsAt.getTime() + (params.durationMs ?? DEFAULT_DURATION_MS));
  const stamp = toGcalUtcCompact(new Date());
  const dtStart = toGcalUtcCompact(params.startsAt);
  const dtEnd = toGcalUtcCompact(end);
  const desc = [params.description, params.url ? `\n\n${params.url}` : ""].join("").trim();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Portal Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${params.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(params.title)}`,
    `DESCRIPTION:${escapeIcsText(desc)}`,
    `LOCATION:${escapeIcsText(params.venue)}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Event tomorrow",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Event in 1 hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
