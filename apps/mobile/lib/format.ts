/** Small display helpers shared across screens. */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Apr 7, 2026" from an ISO date string (or null → "Date TBD"). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Date TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date TBD";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Apr 7 – Apr 19, 2026" or single date when no end / same day. */
export function formatDateRange(
  startIso: string | null | undefined,
  endIso: string | null | undefined
): string {
  if (!startIso) return "Date TBD";
  const start = formatDate(startIso);
  if (!endIso) return start;
  if (startIso.slice(0, 10) === endIso.slice(0, 10)) return start;
  return `${start} – ${formatDate(endIso)}`;
}

/** YYYY-MM-DD for an ISO date (used as a stable form value). */
export function dateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "Sat, Jun 14, 2026 · 5:30 PM ET" in US Eastern time (mirrors web portal events). */
export function formatEventStart(iso: string | null | undefined): string {
  if (!iso) return "Date TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date TBD";
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${fmt.format(d)} ET`;
  } catch {
    return `${formatDate(iso)} ET`;
  }
}

export function fullName(
  first: string | null | undefined,
  last: string | null | undefined,
  fallback?: string | null
): string {
  const joined = [first, last].filter(Boolean).join(" ").trim();
  return joined || fallback || "";
}
