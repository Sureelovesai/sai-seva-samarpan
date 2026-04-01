import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appOrigin(): string {
  const raw =
    (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() ||
    (process.env.VERCEL_URL ? `https://${String(process.env.VERCEL_URL).trim()}` : "");
  if (raw && (raw.startsWith("http://") || raw.startsWith("https://"))) {
    return raw.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

/** ADMIN role emails + SEVA_COORDINATOR emails whose city list includes `city` (case-insensitive). */
export async function getCommunityOutreachReviewerEmails(activityCity: string): Promise<string[]> {
  const cityNorm = activityCity.trim().toLowerCase();
  const rows = await prisma.roleAssignment.findMany({
    where: {
      OR: [{ role: "ADMIN" }, { role: "SEVA_COORDINATOR" }],
    },
    select: { email: true, role: true, cities: true },
  });
  const out = new Set<string>();
  for (const r of rows) {
    const em = r.email?.trim();
    if (!em) continue;
    if (r.role === "ADMIN") {
      out.add(em);
      continue;
    }
    if (r.role === "SEVA_COORDINATOR" && r.cities) {
      const list = r.cities
        .split(",")
        .map((c: string) => c.trim().toLowerCase())
        .filter(Boolean);
      if (list.some((c: string) => c === cityNorm)) out.add(em);
    }
  }
  return [...out];
}

export async function notifyReviewersProfileSubmitted(params: {
    organizationName: string;
    city: string;
    submitterEmail: string;
    submitterName: string;
  }
): Promise<void> {
  const origin = appOrigin();
  const adminUrl = `${origin}/admin/seva-dashboard#pending-community-outreach`;
  const recipients = await getCommunityOutreachReviewerEmails(params.city);
  if (recipients.length === 0) {
    console.warn(
      "[communityOutreach] No ADMIN or matching SEVA_COORDINATOR emails for notifications. Add roles in Admin → Roles."
    );
    return;
  }
  const subject = `[Community Outreach] Organization profile pending review: ${params.organizationName}`;
  const html = `
    <p>A community organization profile was submitted for review.</p>
    <p><strong>Organization:</strong> ${escapeHtml(params.organizationName)}</p>
    <p><strong>City / center:</strong> ${escapeHtml(params.city)}</p>
    <p><strong>Submitted by:</strong> ${escapeHtml(params.submitterName)} (${escapeHtml(params.submitterEmail)})</p>
    <p><a href="${adminUrl}" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Review in Admin</a></p>
    <p>Jai Sai Ram.</p>
  `;
  for (const to of recipients) {
    const result = await sendEmail({ to, subject, html });
    if (!result.ok) {
      console.error("[communityOutreach] notify reviewer failed", to, result.error ?? result.skipped);
    }
  }
}

export async function notifyUserProfileDecision(params: {
  to: string;
  organizationName: string;
  approved: boolean;
  note?: string | null;
}): Promise<void> {
  const origin = appOrigin();
  const postUrl = `${origin}/community-outreach/post-activity`;
  const subject = params.approved
    ? `[Community Outreach] Your organization profile was approved`
    : `[Community Outreach] Your organization profile was not approved`;
  const html = params.approved
    ? `
    <p>Your organization profile for <strong>${escapeHtml(params.organizationName)}</strong> has been approved.</p>
    <p>You can now post service activities to Find Seva.</p>
    <p><a href="${postUrl}" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Post a service activity</a></p>
    <p>Jai Sai Ram.</p>
  `
    : `
    <p>Your organization profile for <strong>${escapeHtml(params.organizationName)}</strong> was not approved at this time.</p>
    ${params.note ? `<p><strong>Note:</strong> ${escapeHtml(params.note)}</p>` : ""}
    <p>If you have questions, please contact your regional seva coordinator or admin team.</p>
    <p>Jai Sai Ram.</p>
  `;
  const result = await sendEmail({ to: params.to, subject, html });
  if (!result.ok) {
    console.error("[communityOutreach] notify user decision failed", result.error ?? result.skipped);
  }
}
