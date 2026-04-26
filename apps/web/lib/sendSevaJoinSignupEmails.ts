import { sendEmail } from "@/lib/email";
import { formatActivityDateTime } from "@/lib/formatSevaDateTime";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function publicAppBaseUrl(): string {
  return (
    (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() ||
    (process.env.VERCEL_URL ? `https://${String(process.env.VERCEL_URL).trim()}` : "")
  );
}

/** Absolute URL for email clients; empty if app URL is not configured. */
function absoluteSevaActivityViewDetailsUrl(activityId: string): string {
  const base = publicAppBaseUrl().replace(/\/$/, "");
  if (!base || !activityId) return "";
  return `${base}/seva-activities?id=${encodeURIComponent(activityId)}`;
}

function firstNameFromVolunteerName(volunteerName: string): string {
  const t = volunteerName.trim();
  if (!t) return "";
  return t.split(/\s+/)[0] ?? t;
}

function formatLocationVenueLine(locationName: string | null | undefined, address: string | null | undefined): string {
  const loc = (locationName ?? "").trim();
  const addr = (address ?? "").trim();
  if (loc && addr) return `${loc} — ${addr}`;
  return loc || addr || "—";
}

export type JoinSignupActivityEmailFields = {
  /** Used for the “View details” link in volunteer confirmation. */
  id: string;
  title: string | null;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  coordinatorPhone: string | null;
  startDate: Date | string | null;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  address?: string | null;
};

/**
 * Sends join-confirmation emails for a new Seva signup (public Join Seva or bulk import).
 */
export async function sendSevaJoinSignupEmails(params: {
  activity: JoinSignupActivityEmailFields;
  volunteerName: string;
  email: string;
  phone: string | null;
  adultsCount: number;
  kidsCount: number;
  status: "APPROVED" | "PENDING";
  /** Optional lines appended to volunteer email (e.g. bulk-registered items). */
  itemLines?: { itemName: string; quantity: number }[];
  /** When true, only the volunteer email is sent (e.g. bulk import sends one coordinator digest at the end). */
  skipCoordinatorEmail?: boolean;
}): Promise<void> {
  const {
    activity,
    volunteerName: name,
    email,
    phone,
    adultsCount,
    kidsCount,
    status,
    itemLines,
    skipCoordinatorEmail,
  } = params;

  const activityTitle = activity.title ?? "Seva Activity";
  const coordinatorName = activity.coordinatorName?.trim() || "the coordinator";
  const coordEmail = activity.coordinatorEmail?.trim();
  const coordPhone = activity.coordinatorPhone?.trim();
  const contactLine =
    coordEmail || coordPhone
      ? ` If you have questions, you may contact ${escapeHtml(coordinatorName)}${coordEmail ? ` at ${escapeHtml(coordEmail)}` : ""}${coordPhone ? `${coordEmail ? " or" : ""} ${escapeHtml(coordPhone)}` : ""}.`
      : "";

  const startStr = formatActivityDateTime(
    activity.startDate,
    activity.startTime,
    activity.endTime
  );

  const locationLine = formatLocationVenueLine(activity.locationName, activity.address);
  const firstName = firstNameFromVolunteerName(name);
  const greetingName = firstName || "Sai devotee";
  const viewDetailsUrl = activity.id ? absoluteSevaActivityViewDetailsUrl(activity.id) : "";
  const viewDetailsBlock = viewDetailsUrl
    ? `<p>🔗 <a href="${escapeHtml(viewDetailsUrl)}">View details</a></p>`
    : activity.id
      ? `<p>🔗 View details: open the Seva Portal, use <strong>Find Seva</strong>, and view this activity.</p>`
      : "";

  const itemsBlock =
    itemLines && itemLines.length > 0
      ? `<p><strong>Items registered for you to bring:</strong></p><ul>${itemLines
          .map(
            (l) =>
              `<li>${escapeHtml(l.itemName)} — ${l.quantity} unit${l.quantity === 1 ? "" : "s"}</li>`
          )
          .join("")}</ul>`
      : "";

  const volunteerEmailResult = await sendEmail({
    to: email,
    subject:
      status === "PENDING"
        ? `Waitlist: ${activityTitle}`
        : `Your seva registration is confirmed — ${activityTitle}`,
    html:
      status === "PENDING"
        ? `
        <p>Sai Ram ${escapeHtml(greetingName)},</p>
        <p>Thank you for your interest. Your sign-up is <strong>pending</strong> (waitlist) because the activity is at capacity. If a spot opens, you will receive another email when your sign-up is approved.</p>
        <p><strong>Activity:</strong> ${escapeHtml(activityTitle)}</p>
        <p><strong>Date &amp; Time:</strong> ${escapeHtml(startStr)}</p>
        <p><strong>Location:</strong> ${escapeHtml(locationLine)}</p>
        <p>Kindly arrive 10–15 minutes early if you are later approved. If you signed up to bring items, please carry them along.</p>
        ${viewDetailsBlock}
        ${itemsBlock}
        <p>You will not receive the usual 24-hour reminder until your sign-up is approved.${contactLine}</p>
        <p>Love All • Serve All<br />Jai Sai Ram 🙏</p>
      `
        : `
        <p>Sai Ram ${escapeHtml(greetingName)},</p>
        <p>Your seva registration is confirmed. 🙏</p>
        <p><strong>Activity:</strong> ${escapeHtml(activityTitle)}</p>
        <p><strong>Date &amp; Time:</strong> ${escapeHtml(startStr)}</p>
        <p><strong>Location:</strong> ${escapeHtml(locationLine)}</p>
        <p>Kindly arrive 10–15 minutes early. If you signed up to bring items, please carry them along.</p>
        ${viewDetailsBlock}
        ${itemsBlock}
        <p>You will receive a reminder 24 hours before the activity starts.${contactLine}</p>
        <p>Love All • Serve All<br />Jai Sai Ram 🙏</p>
      `,
  });
  if (!volunteerEmailResult.ok) {
    console.error(
      "Seva join signup: volunteer email failed",
      volunteerEmailResult.error ?? volunteerEmailResult.skipped
    );
  }

  if (coordEmail && !skipCoordinatorEmail) {
    const coordinatorEmailResult = await sendEmail({
      to: coordEmail,
      subject:
        status === "PENDING"
          ? `Waitlist sign-up: ${activityTitle}`
          : `New volunteer joined: ${activityTitle}`,
      html: `
          <p>${status === "PENDING" ? "A volunteer has joined the <strong>waitlist</strong> (pending — activity at capacity)." : "A new volunteer has signed up for your seva activity (approved)."}</p>
          <p><strong>Activity:</strong> ${escapeHtml(activityTitle)}</p>
          <p><strong>Start:</strong> ${escapeHtml(startStr)}</p>
          ${activity.locationName || activity.address ? `<p><strong>Location:</strong> ${escapeHtml(formatLocationVenueLine(activity.locationName, activity.address))}</p>` : ""}
          <p><strong>Volunteer:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
          <p><strong>Participants:</strong> ${adultsCount} adult(s), ${kidsCount} child(ren) — ${adultsCount + kidsCount} total</p>
          <p><strong>Status:</strong> ${status === "PENDING" ? "PENDING (waitlist)" : "APPROVED"}</p>
          ${itemsBlock}
          <p>Jai Sai Ram.</p>
        `,
    });
    if (!coordinatorEmailResult.ok) {
      console.error(
        "Seva join signup: coordinator email failed",
        coordinatorEmailResult.error ?? coordinatorEmailResult.skipped
      );
    }
  }
}
