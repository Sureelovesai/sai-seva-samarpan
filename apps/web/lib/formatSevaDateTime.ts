/**
 * Format seva activity date and time for display (Find Seva, emails, etc.).
 * Uses date-only for the calendar day (avoids timezone shift) and AM/PM for times.
 */

export function timeToAMPM(hhmm: string | null | undefined): string {
  if (!hhmm || !String(hhmm).trim()) return "";
  const [h, m] = String(hhmm).trim().split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return hhmm;
  const min = (m ?? "00").padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

/**
 * Format startDate (Date or ISO string) as calendar date only (e.g. "Mar 22, 2025")
 * so the displayed day is correct regardless of timezone.
 */
export function formatActivityDate(startDate: Date | string | null | undefined): string {
  if (startDate == null) return "";
  const iso = typeof startDate === "string" ? startDate : startDate.toISOString();
  const dateOnly = iso.slice(0, 10);
  const [y, mo, day] = dateOnly.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(day)) return "";
  const d = new Date(y, mo - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Full date and time string for emails/display: e.g. "March 22, 2025, 2:30 PM – 4:00 PM"
 */
export function formatActivityDateTime(
  startDate: Date | string | null | undefined,
  startTime?: string | null,
  endTime?: string | null
): string {
  const dateStr = formatActivityDate(startDate);
  if (!dateStr) return "TBD";
  const startAMPM = timeToAMPM(startTime ?? null);
  const endAMPM = timeToAMPM(endTime ?? null);
  const timeStr = [startAMPM, endAMPM].filter(Boolean).join(" – ");
  return timeStr ? `${dateStr}, ${timeStr}` : dateStr;
}
