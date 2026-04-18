import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { formatActivityDateTime } from "@/lib/formatSevaDateTime";
import { getSevaActivityStartInstant, getSevaReminderTimezone } from "@/lib/sevaActivityStartInstant";
import { runPortalEvent24hReminders } from "@/lib/portalEventRemindersCron";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * GET/POST /api/cron/seva-reminders
 * Call this from a cron job every hour (see apps/web/vercel.json). Sends:
 * - **Seva:** reminder emails ~24 hours before each activity starts:
 * - **Join Seva (APPROVED)** volunteers: reminder about attending.
 * - **Item-only** contributors (Register): reminder about supplies — only if their email is not already an APPROVED on-site signup (avoids duplicate emails).
 * - **Coordinator**: one email per activity with approved participants and/or all item contributions listed.
 * PENDING (waitlist) sign-ups do not receive the 24h reminder until approved.
 * - **Portal events:** reminder emails ~24 hours before each published event’s `startsAt` to YES/MAYBE RSVPs (see `lib/portalEventRemindersCron.ts`).
 * Optional: set CRON_SECRET in env and pass ?secret=... or Authorization: Bearer <secret> to protect the endpoint.
 */
export async function GET(req: Request) {
  return runReminders(req);
}

export async function POST(req: Request) {
  return runReminders(req);
}

async function runReminders(req: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const urlSecret = new URL(req.url).searchParams.get("secret");
    const authHeader = req.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (urlSecret !== cronSecret && bearer !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    const windowStartMs = now.getTime() + 23 * 60 * 60 * 1000;
    const windowEndMs = now.getTime() + 25 * 60 * 60 * 1000;
    const tz = getSevaReminderTimezone();

    /** Coarse DB filter only (true start uses startDate + startTime in tz). */
    const coarsePast = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const coarseFuture = new Date(now.getTime() + 96 * 60 * 60 * 1000);

    const candidates = await prisma.sevaActivity.findMany({
      where: {
        isActive: true,
        reminderSentAt: null,
        startDate: { not: null, gte: coarsePast, lte: coarseFuture },
      },
      include: {
        signups: {
          where: { status: "APPROVED" },
        },
        contributionItems: {
          include: {
            claims: {
              where: { status: "CONFIRMED" },
            },
          },
        },
      },
    });

    const activities = candidates.filter(
      (a: { startDate: Date | null; startTime: string | null }) => {
        if (!a.startDate) return false;
        const startMs = getSevaActivityStartInstant(a.startDate, a.startTime, tz).getTime();
        return startMs >= windowStartMs && startMs <= windowEndMs;
      }
    );

    const results: {
      activityId: string;
      title: string;
      onsiteVolunteerEmails: number;
      itemOnlyEmails: number;
      coordinatorSent: boolean;
    }[] = [];

    for (const activity of activities) {
      const title = activity.title ?? "Seva Activity";
      const startStr = formatActivityDateTime(
        activity.startDate,
        activity.startTime,
        activity.endTime
      );

      const approvedSignups = activity.signups;
      const signupEmailSet = new Set(
        approvedSignups.map((s: (typeof approvedSignups)[number]) => s.email.trim().toLowerCase())
      );

      let onsiteVolunteerEmails = 0;
      for (const signup of approvedSignups) {
        const ok = await sendEmail({
          to: signup.email,
          subject: `Reminder: ${title} starts in 24 hours`,
          html: `
            <p>Dear ${escapeHtml(signup.volunteerName)},</p>
            <p>This is a reminder that the seva activity <strong>${escapeHtml(title)}</strong> is scheduled to start in about 24 hours.</p>
            <p><strong>Start:</strong> ${escapeHtml(startStr)}</p>
            ${activity.locationName ? `<p><strong>Location:</strong> ${escapeHtml(activity.locationName)}</p>` : ""}
            ${activity.coordinatorEmail ? `<p>If you have questions, contact the coordinator at ${escapeHtml(activity.coordinatorEmail)}.</p>` : ""}
            <p>Jai Sai Ram.</p>
          `,
        });
        if (ok.ok) onsiteVolunteerEmails++;
      }

      type ItemLine = { volunteerName: string; email: string; phone: string | null; itemName: string; quantity: number };
      const allClaimRows: ItemLine[] = [];
      for (const row of activity.contributionItems) {
        for (const c of row.claims) {
          allClaimRows.push({
            volunteerName: c.volunteerName,
            email: c.email,
            phone: c.phone,
            itemName: row.name,
            quantity: c.quantity,
          });
        }
      }

      const itemReminderByEmail = new Map<
        string,
        { volunteerName: string; lines: { itemName: string; quantity: number }[] }
      >();
      for (const r of allClaimRows) {
        const em = r.email.trim().toLowerCase();
        if (signupEmailSet.has(em)) continue;
        const cur = itemReminderByEmail.get(em) ?? { volunteerName: r.volunteerName, lines: [] };
        cur.lines.push({ itemName: r.itemName, quantity: r.quantity });
        itemReminderByEmail.set(em, cur);
      }

      let itemOnlyEmails = 0;
      for (const [toEmail, data] of itemReminderByEmail) {
        const linesHtml = data.lines
          .map(
            (l) =>
              `<li><strong>${escapeHtml(l.itemName)}</strong> — ${l.quantity} unit${l.quantity === 1 ? "" : "s"}</li>`
          )
          .join("");
        const ok = await sendEmail({
          to: toEmail,
          subject: `Reminder: supplies for ${title} (24 hours)`,
          html: `
            <p>Dear ${escapeHtml(data.volunteerName)},</p>
            <p>This is a reminder that <strong>${escapeHtml(title)}</strong> is scheduled to start in about 24 hours.</p>
            <p>You registered to bring:</p>
            <ul>${linesHtml}</ul>
            <p><strong>Start:</strong> ${escapeHtml(startStr)}</p>
            ${activity.locationName ? `<p><strong>Location / drop-off:</strong> ${escapeHtml(activity.locationName)}</p>` : ""}
            ${activity.coordinatorEmail ? `<p>If you have questions, contact the coordinator at ${escapeHtml(activity.coordinatorEmail)}.</p>` : ""}
            <p>Jai Sai Ram.</p>
          `,
        });
        if (ok.ok) itemOnlyEmails++;
      }

      let coordinatorSent = false;
      const coord = activity.coordinatorEmail?.trim();
      if (coord && (approvedSignups.length > 0 || allClaimRows.length > 0)) {
        const totalParticipants = approvedSignups.reduce(
          (sum: number, s: (typeof approvedSignups)[number]) =>
            sum + (s.adultsCount ?? 1) + (s.kidsCount ?? 0),
          0
        );
        const signupList =
          approvedSignups.length > 0
            ? `<p><strong>On-site volunteers (APPROVED) — ${totalParticipants} participant(s):</strong></p><ul>${approvedSignups
                .map((s: (typeof approvedSignups)[number]) => {
                  const a = s.adultsCount ?? 1;
                  const k = s.kidsCount ?? 0;
                  const part = a + k > 1 ? ` — ${a} adult(s), ${k} child(ren)` : "";
                  return `<li>${escapeHtml(s.volunteerName)} — ${escapeHtml(s.email)}${s.phone ? ` — ${escapeHtml(s.phone)}` : ""}${part}</li>`;
                })
                .join("")}</ul>`
            : "<p><strong>On-site volunteers:</strong> none approved yet.</p>";

        const claimsList =
          allClaimRows.length > 0
            ? `<p><strong>Item contributions (Register):</strong></p><ul>${allClaimRows
                .map(
                  (r) =>
                    `<li>${escapeHtml(r.volunteerName)} — ${escapeHtml(r.email)}${r.phone ? ` — ${escapeHtml(r.phone)}` : ""}: ${r.quantity} × ${escapeHtml(r.itemName)}</li>`
                )
                .join("")}</ul>`
            : "";

        const coordOk = await sendEmail({
          to: coord,
          subject: `Reminder: ${title} starts in 24 hours`,
          html: `
            <p>Your seva activity <strong>${escapeHtml(title)}</strong> is scheduled to start in about 24 hours.</p>
            <p><strong>Start:</strong> ${escapeHtml(startStr)}</p>
            ${activity.locationName ? `<p><strong>Location:</strong> ${escapeHtml(activity.locationName)}</p>` : ""}
            ${signupList}
            ${claimsList}
            <p>Jai Sai Ram.</p>
          `,
        });
        coordinatorSent = coordOk.ok;
      }

      await prisma.sevaActivity.update({
        where: { id: activity.id },
        data: { reminderSentAt: new Date() },
      });

      results.push({
        activityId: activity.id,
        title,
        onsiteVolunteerEmails,
        itemOnlyEmails,
        coordinatorSent,
      });
    }

    const portal = await runPortalEvent24hReminders(now);

    return NextResponse.json({
      ok: true,
      message: `Seva: ${activities.length} activity(ies); portal events: ${portal.results.length} event(s)`,
      results,
      portalEventResults: portal.results,
    });
  } catch (e) {
    console.error("Reminders cron error:", e);
    return NextResponse.json(
      { error: "Cron failed", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
