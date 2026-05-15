/**
 * Build `/log-hours/certificate/prepare` URL query from a Log Hours row (form or DB).
 * The prepare step collects the youth’s name, parent/guardian, and age attestation before opening the certificate.
 * Date must match `YYYY-MM-DD` expected by the certificate page.
 */
export type LogHoursCertificateRowInput = {
  volunteerName: string;
  location?: string | null;
  activityCategory: string;
  hours: number;
  date: Date | string;
  comments?: string | null;
};

export type CertificatePrepareFromOpts = {
  /** Shapes the “back” link on the prepare page */
  from?: "dashboard" | "log-hours";
};

function logHoursRowToCertificateBaseParams(row: LogHoursCertificateRowInput): URLSearchParams {
  const d = typeof row.date === "string" ? new Date(row.date) : row.date;
  const yyyyMmDd = Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  const p = new URLSearchParams();
  p.set("activity", row.activityCategory.trim());
  p.set("hours", String(row.hours));
  p.set("date", yyyyMmDd);
  p.set("location", (row.location || "").trim());
  if (row.comments?.trim()) p.set("comments", row.comments.trim());
  return p;
}

/** Opens the attestation form; `volunteerName` on the row is not sent (name on the certificate is entered on the next step). */
export function certificatePreparePathFromLoggedHoursRow(
  row: LogHoursCertificateRowInput,
  options?: CertificatePrepareFromOpts
): string {
  const p = logHoursRowToCertificateBaseParams(row);
  if (options?.from) p.set("from", options.from);
  return `/log-hours/certificate/prepare?${p.toString()}`;
}

/**
 * @deprecated Use {@link certificatePreparePathFromLoggedHoursRow}; kept as an alias so existing imports
 * still resolve to the prepare step (no direct certificate skip).
 */
export function certificatePathFromLoggedHoursRow(
  row: LogHoursCertificateRowInput,
  options?: CertificatePrepareFromOpts
): string {
  return certificatePreparePathFromLoggedHoursRow(row, options);
}

/** Final printable certificate URL (after prepare step). */
export function certificateViewPathFromSearchParams(
  certifiedVolunteerName: string,
  base: URLSearchParams
): string {
  const p = new URLSearchParams(base);
  p.delete("from");
  p.set("name", certifiedVolunteerName.trim());
  return `/log-hours/certificate?${p.toString()}`;
}
