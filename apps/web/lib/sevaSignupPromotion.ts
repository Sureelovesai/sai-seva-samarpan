import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { formatActivityDateTime } from "@/lib/formatSevaDateTime";
import { sevaSignupParticipantTotal } from "@/lib/sevaCapacity";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function participantCount(s: { adultsCount: number | null; kidsCount: number | null }): number {
  return sevaSignupParticipantTotal(s);
}

/**
 * Promote waitlisted PENDING signups to APPROVED in FIFO order (createdAt) until capacity is reached.
 * Used when an APPROVED seat is freed, or when activity capacity is increased in Manage Seva.
 * Returns number of signups promoted to APPROVED.
 */
export async function promotePendingSignupsForActivity(activityId: string): Promise<number> {
  const activity = await prisma.sevaActivity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      title: true,
      capacity: true,
      coordinatorName: true,
      coordinatorEmail: true,
      coordinatorPhone: true,
      startDate: true,
      startTime: true,
      endTime: true,
      locationName: true,
    },
  });
  if (!activity) return 0;

  const cap = activity.capacity;
  if (cap == null || cap <= 0) return 0;

  let promoted = 0;
  const title = activity.title ?? "Seva Activity";
  const coordName = activity.coordinatorName?.trim() || "the coordinator";
  const coordEmailTo = activity.coordinatorEmail?.trim();
  const coordPhone = activity.coordinatorPhone?.trim();
  const startStr = formatActivityDateTime(
    activity.startDate,
    activity.startTime,
    activity.endTime
  );

  while (true) {
    const approvedRows = await prisma.sevaSignup.findMany({
      where: { activityId, status: "APPROVED" },
      select: { adultsCount: true, kidsCount: true },
    });
    let used = 0;
    for (const s of approvedRows) used += participantCount(s);

    if (used >= cap) break;

    const nextPending = await prisma.sevaSignup.findFirst({
      where: { activityId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    if (!nextPending) break;

    const need = participantCount(nextPending);
    if (used + need > cap) break;

    await prisma.sevaSignup.update({
      where: { id: nextPending.id },
      data: { status: "APPROVED" },
    });
    promoted++;

    const volEmail = nextPending.email.trim();
    const volName = nextPending.volunteerName.trim() || "Volunteer";
    const adults = nextPending.adultsCount ?? 0;
    const kids = nextPending.kidsCount ?? 0;
    const totalParticipants = participantCount(nextPending);

    const volResult = await sendEmail({
      to: volEmail,
      subject: `Approved: You can attend — ${title}`,
      html: `
        <p>Dear ${escapeHtml(volName)},</p>
        <p>Good news: a spot has opened for <strong>${escapeHtml(title)}</strong>. Your sign-up is now <strong>approved</strong> and you may attend this seva activity.</p>
        <p><strong>When:</strong> ${escapeHtml(startStr)}</p>
        ${activity.locationName ? `<p><strong>Location:</strong> ${escapeHtml(activity.locationName)}</p>` : ""}
        <p><strong>Participants:</strong> ${adults} adult(s), ${kids} child(ren) — ${totalParticipants} total</p>
        ${coordEmailTo || coordPhone ? `<p><strong>Coordinator:</strong> ${escapeHtml(coordName)}${coordEmailTo ? ` — ${escapeHtml(coordEmailTo)}` : ""}${coordPhone ? ` — ${escapeHtml(coordPhone)}` : ""}</p>` : ""}
        <p>You will receive a reminder 24 hours before the activity starts.</p>
        <p>Jai Sai Ram.</p>
      `,
    });
    if (!volResult.ok) {
      console.error("Promote pending: volunteer email failed", volEmail, volResult.error ?? volResult.skipped);
    }

    if (coordEmailTo) {
      const coordResult = await sendEmail({
        to: coordEmailTo,
        subject: `Waitlist promoted: ${title}`,
        html: `
          <p>A volunteer on the waitlist has been <strong>approved</strong> to attend (capacity opened).</p>
          <p><strong>Activity:</strong> ${escapeHtml(title)}</p>
          <p><strong>Start:</strong> ${escapeHtml(startStr)}</p>
          <p><strong>Volunteer:</strong> ${escapeHtml(volName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(volEmail)}</p>
          ${nextPending.phone ? `<p><strong>Phone:</strong> ${escapeHtml(nextPending.phone)}</p>` : ""}
          <p><strong>Participants:</strong> ${adults} adult(s), ${kids} child(ren)</p>
          <p>Jai Sai Ram.</p>
        `,
      });
      if (!coordResult.ok) {
        console.error("Promote pending: coordinator email failed", coordResult.error ?? coordResult.skipped);
      }
    }
  }

  return promoted;
}
