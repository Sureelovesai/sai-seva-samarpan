import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * GET/POST /api/cron/seva-reminders
 * Call this from a cron job (e.g. every hour). Sends reminder emails 24 hours before each activity starts:
 * - One email per volunteer (reminder that activity is tomorrow)
 * - One email per activity to the coordinator with the list of volunteers (only one coordinator email per seva)
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
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const activities = await prisma.sevaActivity.findMany({
      where: {
        isActive: true,
        reminderSentAt: null,
        AND: [
          { startDate: { not: null } },
          { startDate: { gte: windowStart, lte: windowEnd } },
        ],
      },
      include: {
        signups: {
          where: { status: { not: "CANCELLED" } },
        },
      },
    });

    const results: { activityId: string; title: string; volunteerEmails: number; coordinatorSent: boolean }[] = [];

    for (const activity of activities) {
      const title = activity.title ?? "Seva Activity";
      const startDate = activity.startDate!;
      const startStr = startDate.toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      });
      let volunteerCount = 0;
      let coordinatorSent = false;

      for (const signup of activity.signups) {
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
        if (ok.ok) volunteerCount++;
      }

      if (activity.coordinatorEmail?.trim() && activity.signups.length > 0) {
        const list = activity.signups
          .map(
            (s: (typeof activity.signups)[number]) =>
              `<li>${escapeHtml(s.volunteerName)} — ${escapeHtml(s.email)}${s.phone ? ` — ${escapeHtml(s.phone)}` : ""}</li>`
          )
          .join("");
        const coordOk = await sendEmail({
          to: activity.coordinatorEmail.trim(),
          subject: `Reminder: ${title} starts in 24 hours – ${activity.signups.length} volunteer(s)`,
          html: `
            <p>Your seva activity <strong>${escapeHtml(title)}</strong> is scheduled to start in about 24 hours.</p>
            <p><strong>Start:</strong> ${escapeHtml(startStr)}</p>
            <p><strong>Volunteers signed up (${activity.signups.length}):</strong></p>
            <ul>${list}</ul>
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
        volunteerEmails: volunteerCount,
        coordinatorSent,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Processed ${activities.length} activity(ies)`,
      results,
    });
  } catch (e) {
    console.error("Seva reminders cron error:", e);
    return NextResponse.json(
      { error: "Cron failed", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
