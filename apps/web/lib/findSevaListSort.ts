/**
 * Shared sort order for Find Seva and focused landing pages (date → time → title).
 */
export type FindSevaSortable = {
  title: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationHours?: number | null;
};

function timeStringToMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm || !String(hhmm).trim()) return null;
  const [h, m] = String(hhmm).trim().split(":");
  const hour = parseInt(h, 10);
  const min = parseInt(m ?? "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(min)) return null;
  return hour * 60 + min;
}

export function compareFindSevaActivities(a: FindSevaSortable, b: FindSevaSortable): number {
  const ad = a.startDate ? String(a.startDate).slice(0, 10) : "";
  const bd = b.startDate ? String(b.startDate).slice(0, 10) : "";
  if (ad !== bd) {
    if (!ad && bd) return 1;
    if (ad && !bd) return -1;
    return ad.localeCompare(bd);
  }

  const am = timeStringToMinutes(a.startTime);
  const bm = timeStringToMinutes(b.startTime);
  if (am != null && bm != null && am !== bm) return am - bm;
  if (am != null && bm == null) return -1;
  if (am == null && bm != null) return 1;

  const ae = timeStringToMinutes(a.endTime);
  const be = timeStringToMinutes(b.endTime);
  if (ae != null && be != null && ae !== be) return ae - be;
  if (ae != null && be == null) return -1;
  if (ae == null && be != null) return 1;

  return (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
}
