import { randomUUID } from "node:crypto";
import { getPortalEventsEmailFrom, sendEmail } from "@/lib/email";
import { formatPortalEventStart } from "@/lib/formatPortalEventStart";
import { buildEventIcs, buildGoogleCalendarTemplateUrl } from "@/lib/portalEventCalendar";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function responseLabel(r: string): string {
  if (r === "YES") return "Yes";
  if (r === "NO") return "No";
  if (r === "MAYBE") return "Maybe";
  return r;
}

/**
 * After a successful RSVP: notify organizer (if email set) and send participant a confirmation
 * with Google Calendar link + ICS (reminders apply when added to Google Calendar or imported ICS).
 */
export async function sendPortalEventRsvpEmails(params: {
  event: {
    id: string;
    title: string;
    description: string;
    venue: string;
    startsAt: Date;
    organizerEmail: string | null;
  };
  signup: {
    participantName: string;
    email: string;
    response: string;
    accompanyingAdults: number;
    accompanyingKids: number;
    comment: string | null;
  };
  publicEventUrl: string;
}): Promise<void> {
  const { event, signup, publicEventUrl } = params;

  const gcalUrl = buildGoogleCalendarTemplateUrl({
    title: event.title,
    startsAt: event.startsAt,
    venue: event.venue,
    description: event.description,
  });

  const ics = buildEventIcs({
    uid: `${event.id}-${randomUUID()}@portal-event`,
    title: event.title,
    startsAt: event.startsAt,
    venue: event.venue,
    description: event.description,
    url: publicEventUrl,
  });
  const icsBase64 = Buffer.from(ics, "utf8").toString("base64");

  const guestLine = `${signup.accompanyingAdults} adult(s), ${signup.accompanyingKids} kid(s) (group counts include the person named)`;
  const commentLine = signup.comment?.trim()
    ? `<p><strong>Comment:</strong> ${escapeHtml(signup.comment)}</p>`
    : "";

  const orgHtml = `
    <p>New RSVP for <strong>${escapeHtml(event.title)}</strong>.</p>
    <p><strong>When:</strong> ${escapeHtml(formatPortalEventStart(event.startsAt))}</p>
    <ul>
      <li><strong>Name:</strong> ${escapeHtml(signup.participantName)}</li>
      <li><strong>Email:</strong> ${escapeHtml(signup.email)}</li>
      <li><strong>Response:</strong> ${escapeHtml(responseLabel(signup.response))}</li>
      <li><strong>Guests:</strong> ${escapeHtml(guestLine)}</li>
    </ul>
    ${commentLine}
    <p><a href="${escapeHtml(publicEventUrl)}">Open event page</a></p>
    <p><strong>Add to Google Calendar:</strong> <a href="${escapeHtml(gcalUrl)}">Create event in Google Calendar</a></p>
    <p style="font-size:12px;color:#555">Google Calendar reminders (e.g. 1 day or 1 hour before) apply after you add the event, using each person’s reminder settings in Google.</p>
  `;

  const fromEvents = getPortalEventsEmailFrom();

  if (event.organizerEmail?.trim()) {
    const organizerResult = await sendEmail({
      from: fromEvents,
      to: event.organizerEmail.trim(),
      subject: `[Event RSVP] ${responseLabel(signup.response)} · ${event.title}`,
      html: orgHtml,
    });
    if (!organizerResult.ok) {
      console.error(
        "portal-events RSVP organizer email failed:",
        organizerResult.error ?? organizerResult.skipped ?? "unknown"
      );
    }
  }

  const volHtml = `
    <p>Hi ${escapeHtml(signup.participantName)},</p>
    <p>Your response for <strong>${escapeHtml(event.title)}</strong> is recorded as <strong>${escapeHtml(
      responseLabel(signup.response)
    )}</strong>.</p>
    <p><strong>When:</strong> ${escapeHtml(formatPortalEventStart(event.startsAt))}</p>
    <p><strong>Where:</strong> ${escapeHtml(event.venue)}</p>
    <p><a href="${escapeHtml(publicEventUrl)}">Event details</a></p>
    <p><strong>Add to Google Calendar:</strong> <a href="${escapeHtml(gcalUrl)}">Add to Google Calendar</a></p>
    <p style="font-size:12px;color:#555">After you add this event in Google Calendar, notifications use <strong>your</strong> default reminder settings in Google (for example 30 minutes or 24 hours before — you can change them on the event). The attached .ics file includes 24-hour and 1-hour reminders for many calendar apps.</p>
    <p>Jai Sai Ram.</p>
  `;

  const participantResult = await sendEmail({
    from: fromEvents,
    to: signup.email.trim(),
    subject: `RSVP recorded: ${event.title}`,
    html: volHtml,
    attachments: [{ filename: "event.ics", content: icsBase64 }],
  });
  if (!participantResult.ok) {
    throw new Error(
      `Participant confirmation email failed: ${participantResult.error ?? (participantResult.skipped ? "sending skipped by config" : "unknown")}`
    );
  }
}
