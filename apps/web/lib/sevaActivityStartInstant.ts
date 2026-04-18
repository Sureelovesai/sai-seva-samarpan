/**
 * Build the UTC instant when a seva activity starts, using the calendar day from
 * `startDate` (same Y-M-D as formatActivityDate) + `startTime` as wall clock in `timeZone`.
 */

function cmpWall(
  p: { y: number; mo: number; d: number; h: number; m: number },
  y: number,
  mo: number,
  d: number,
  h: number,
  m: number
): number {
  if (p.y !== y) return p.y < y ? -1 : 1;
  if (p.mo !== mo) return p.mo < mo ? -1 : 1;
  if (p.d !== d) return p.d < d ? -1 : 1;
  if (p.h !== h) return p.h < h ? -1 : 1;
  if (p.m !== m) return p.m < m ? -1 : 1;
  return 0;
}

function zonedWallTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  function getParts(utcMs: number) {
    const parts = formatter.formatToParts(new Date(utcMs));
    const obj: Record<string, number> = {};
    for (const p of parts) {
      if (
        p.type === "year" ||
        p.type === "month" ||
        p.type === "day" ||
        p.type === "hour" ||
        p.type === "minute"
      ) {
        obj[p.type] = Number(p.value);
      }
    }
    return { y: obj.year!, mo: obj.month!, d: obj.day!, h: obj.hour!, m: obj.minute! };
  }

  let lo = Date.UTC(year, month - 1, day, hour, minute) - 48 * 60 * 60 * 1000;
  let hi = Date.UTC(year, month - 1, day, hour, minute) + 48 * 60 * 60 * 1000;

  for (let i = 0; i < 64; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const c = cmpWall(getParts(mid), year, month, day, hour, minute);
    if (c === 0) return mid;
    if (c < 0) lo = mid + 1;
    else hi = mid - 1;
  }

  return Date.UTC(year, month - 1, day, hour, minute);
}

export function getSevaReminderTimezone(): string {
  return (
    process.env.SEVA_REMINDER_TIMEZONE?.trim() ||
    process.env.NEXT_PUBLIC_EVENT_TIMEZONE?.trim() ||
    "America/New_York"
  );
}

export function getSevaActivityStartInstant(
  startDate: Date,
  startTime: string | null | undefined,
  timeZone = getSevaReminderTimezone()
): Date {
  const ymd = startDate.toISOString().slice(0, 10);
  const [y, mo, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const raw = (startTime && String(startTime).trim()) || "00:00";
  const [hh, mm] = raw.split(":").map((x) => parseInt(x, 10));
  const hour = Number.isFinite(hh) ? hh : 0;
  const minute = Number.isFinite(mm) ? mm : 0;
  const ms = zonedWallTimeToUtcMs(y, mo, d, hour, minute, timeZone);
  return new Date(ms);
}
