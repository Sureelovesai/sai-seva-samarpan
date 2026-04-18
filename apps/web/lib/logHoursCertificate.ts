/**
 * Build `/log-hours/certificate` URL query from a Log Hours row (form or DB).
 * Date must match `YYYY-MM-DD` expected by the certificate page.
 */
export function certificatePathFromLoggedHoursRow(row: {
  volunteerName: string;
  location?: string | null;
  activityCategory: string;
  hours: number;
  date: Date | string;
  comments?: string | null;
}): string {
  const d = typeof row.date === "string" ? new Date(row.date) : row.date;
  const yyyyMmDd = Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  const p = new URLSearchParams();
  p.set("name", row.volunteerName.trim());
  p.set("activity", row.activityCategory.trim());
  p.set("hours", String(row.hours));
  p.set("date", yyyyMmDd);
  p.set("location", (row.location || "").trim());
  if (row.comments?.trim()) p.set("comments", row.comments.trim());
  return `/log-hours/certificate?${p.toString()}`;
}
