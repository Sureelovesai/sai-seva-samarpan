import { prisma } from "@/lib/prisma";
import { getPortalEventsEmailFrom, sendEmail } from "@/lib/email";
import { formatPortalEventStart } from "@/lib/formatPortalEventStart";

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
  const app =
    raw && (raw.startsWith("http://") || raw.startsWith("https://"))
      ? raw.replace(/\/+$/, "")
      : "http://localhost:3000";
  return app;
}

export type PortalEventReminderCronResult = {
  eventId: string;
  title: string;
  emailsSent: number;
  eligibleSignups: number;
};

/**
 * Sends ~24h-before reminder emails for published portal events whose `startsAt` falls in the
 * same 23–25h window as seva reminders. Only YES/MAYBE RSVPs receive mail; one email per address.
 * Sets `reminderSentAt` on the event after processing.
 */
export async function runPortalEvent24hReminders(now: Date): Promise<{
  results: PortalEventReminderCronResult[];
}> {
  const windowStartMs = now.getTime() + 23 * 60 * 60 * 1000;
  const windowEndMs = now.getTime() + 25 * 60 * 60 * 1000;

  const coarsePast = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const coarseFuture = new Date(now.getTime() + 96 * 60 * 60 * 1000);

  const candidates = await prisma.portalEvent.findMany({
    where: {
      status: "PUBLISHED",
      reminderSentAt: null,
      startsAt: { gte: coarsePast, lte: coarseFuture },
    },
    include: { signups: true },
  });

  const events = candidates.filter((e: { startsAt: Date }) => {
    const t = e.startsAt.getTime();
    return t >= windowStartMs && t <= windowEndMs;
  });

  const results: PortalEventReminderCronResult[] = [];
  const origin = appOrigin();
  const fromEvents = getPortalEventsEmailFrom();

  for (const event of events) {
    const title = event.title ?? "Event";
    const whenStr = formatPortalEventStart(event.startsAt);
    const eventUrl = `${origin}/events/${event.id}`;

    const toRemind = event.signups.filter(
      (s: { response: string }) => s.response === "YES" || s.response === "MAYBE"
    );
    const seen = new Set<string>();
    let emailsSent = 0;

    for (const s of toRemind) {
      const em = s.email.trim().toLowerCase();
      if (!em || seen.has(em)) continue;
      seen.add(em);

      const responseNote =
        s.response === "MAYBE"
          ? "<p><strong>Your response:</strong> Maybe — let us know if your plans change.</p>"
          : "<p><strong>Your response:</strong> Yes — we look forward to seeing you.</p>";

      const guestLine = `${s.accompanyingAdults} adult(s), ${s.accompanyingKids} kid(s) (group counts include you)`;

      const ok = await sendEmail({
        from: fromEvents,
        to: s.email.trim(),
        subject: `Reminder: ${title} starts in about 24 hours`,
        html: `
          <p>Dear ${escapeHtml(s.participantName)},</p>
          <p>This is a reminder that <strong>${escapeHtml(title)}</strong> is scheduled to start in about 24 hours.</p>
          ${responseNote}
          <p><strong>When:</strong> ${escapeHtml(whenStr)}</p>
          <p><strong>Where:</strong> ${escapeHtml(event.venue)}</p>
          <p><strong>Guests (besides you):</strong> ${escapeHtml(guestLine)}</p>
          <p><a href="${escapeHtml(eventUrl)}">Event details</a></p>
          ${event.organizerEmail?.trim() ? `<p>Questions: ${escapeHtml(event.organizerEmail.trim())}</p>` : ""}
          <p>Jai Sai Ram.</p>
        `,
      });
      if (ok.ok) emailsSent++;
    }

    await prisma.portalEvent.update({
      where: { id: event.id },
      data: { reminderSentAt: new Date() },
    });

    results.push({
      eventId: event.id,
      title,
      emailsSent,
      eligibleSignups: seen.size,
    });
  }

  return { results };
}
