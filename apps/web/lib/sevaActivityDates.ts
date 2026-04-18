/** YYYY-MM-DD in UTC from a Date (matches existing seva listing logic). */
export function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD strings for each day in the given calendar month (local year/month). */
export function eachDateKeyInMonth(year: number, month1to12: number): string[] {
  const idx = month1to12 - 1;
  const last = new Date(year, idx + 1, 0).getDate();
  const y = String(year);
  const m = String(month1to12).padStart(2, "0");
  const out: string[] = [];
  for (let day = 1; day <= last; day++) {
    out.push(`${y}-${m}-${String(day).padStart(2, "0")}`);
  }
  return out;
}

/**
 * True if the activity runs on the given calendar day (inclusive range startDate..endDate).
 * Undated activities return false.
 */
export function activitySpansDateKey(
  a: { startDate: Date | null; endDate: Date | null },
  dayKey: string
): boolean {
  if (!a.startDate && !a.endDate) return false;
  const s0 = a.startDate ?? a.endDate!;
  const e0 = a.endDate ?? a.startDate ?? s0;
  const s = s0 <= e0 ? s0 : e0;
  const e = e0 >= s0 ? e0 : s0;
  const sk = dateKeyUTC(s);
  const ek = dateKeyUTC(e);
  return sk <= dayKey && ek >= dayKey;
}

/**
 * True if the activity's inclusive date range overlaps [fromKey, toKey] (YYYY-MM-DD, UTC keys).
 * Undated activities return false.
 */
export function activityOverlapsDateRange(
  a: { startDate: Date | null; endDate: Date | null },
  fromKey: string,
  toKey: string
): boolean {
  if (!a.startDate && !a.endDate) return false;
  const s0 = a.startDate ?? a.endDate!;
  const e0 = a.endDate ?? a.startDate ?? s0;
  const s = s0 <= e0 ? s0 : e0;
  const e = e0 >= s0 ? e0 : s0;
  const sk = dateKeyUTC(s);
  const ek = dateKeyUTC(e);
  let f = fromKey;
  let t = toKey;
  if (f > t) {
    const x = f;
    f = t;
    t = x;
  }
  return sk <= t && ek >= f;
}
