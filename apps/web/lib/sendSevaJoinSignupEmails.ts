import { sendEmail } from "@/lib/email";
import { formatActivityDateTime } from "@/lib/formatSevaDateTime";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type JoinSignupActivityEmailFields = {
  title: string | null;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  coordinatorPhone: string | null;
  startDate: Date | string | null;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
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
        ? `Pending: ${activityTitle} (waitlist)`
        : `You've joined: ${activityTitle}`,
    html:
      status === "PENDING"
        ? `
        <p>Dear ${escapeHtml(name)},</p>
        <p>Thank you for your interest in the seva activity: <strong>${escapeHtml(activityTitle)}</strong>.</p>
        <p>Your sign-up is <strong>pending</strong> because the activity is at capacity. You are on the <strong>waitlist</strong>. If a spot opens, you will receive another email when your sign-up is approved.</p>
        <p><strong>When:</strong> ${escapeHtml(startStr)}</p>
        ${activity.locationName ? `<p><strong>Location:</strong> ${escapeHtml(activity.locationName)}</p>` : ""}
        <p><strong>Participants requested:</strong> ${adultsCount} adult(s), ${kidsCount} child(ren)</p>
        ${itemsBlock}
        <p>You will not receive the usual 24-hour reminder until your sign-up is approved.${contactLine}</p>
        <p>Jai Sai Ram.</p>
      `
        : `
        <p>Dear ${escapeHtml(name)},</p>
        <p>Thank you for joining the seva activity: <strong>${escapeHtml(activityTitle)}</strong>.</p>
        <p>Your sign-up has been <strong>approved</strong>. You will receive a reminder 24 hours before the activity starts.${contactLine}</p>
        ${itemsBlock}
        <p>Jai Sai Ram.</p>
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
          ${activity.locationName ? `<p><strong>Location:</strong> ${escapeHtml(activity.locationName)}</p>` : ""}
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
