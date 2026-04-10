import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { isPrismaColumnMissing } from "@/lib/prismaMissingPortalEvent";
import { sendPortalEventRsvpEmails } from "@/lib/portalEventRsvpEmails";

function publicEventAbsoluteUrl(req: Request, eventId: string): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (env) return `${env}/events/${eventId}`;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}/events/${eventId}` : `/events/${eventId}`;
}

async function notifyAfterRsvp(
  req: Request,
  event: {
    id: string;
    title: string;
    description: string;
    venue: string;
    startsAt: Date;
    organizerEmail: string | null;
  },
  signup: {
    participantName: string;
    email: string;
    response: string;
    accompanyingAdults: number;
    accompanyingKids: number;
    comment: string | null;
  },
  eventId: string
) {
  try {
    await sendPortalEventRsvpEmails({
      event,
      signup,
      publicEventUrl: publicEventAbsoluteUrl(req, eventId),
    });
  } catch (err: unknown) {
    console.error("portal-events RSVP notification email:", err);
  }
}

function revalidateEventRoutes(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
}

function parseGuestCount(raw: unknown, max = 500): number {
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? Math.floor(raw)
      : parseInt(String(raw ?? "0"), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, n);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const event = await prisma.portalEvent.findFirst({
      where: { id: eventId, status: "PUBLISHED", signupsEnabled: true },
      select: {
        id: true,
        title: true,
        description: true,
        venue: true,
        startsAt: true,
        organizerEmail: true,
      },
    });
    if (!event) {
      return NextResponse.json(
        { error: "Event not found or sign-ups are closed." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const participantName = typeof body.participantName === "string" ? body.participantName.trim() : "";
    if (!participantName || participantName.length > 200) {
      return NextResponse.json({ error: "Name is required (max 200 characters)." }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    const rawComment = typeof body.comment === "string" ? body.comment.trim() : "";
    if (rawComment.length > 500) {
      return NextResponse.json({ error: "Comment must be at most 500 characters." }, { status: 400 });
    }
    const comment = rawComment.length > 0 ? rawComment : null;

    let accompanyingAdults = parseGuestCount(body.accompanyingAdults);
    let accompanyingKids = parseGuestCount(body.accompanyingKids);

    const usesLegacyCount =
      !Object.prototype.hasOwnProperty.call(body, "accompanyingAdults") &&
      !Object.prototype.hasOwnProperty.call(body, "accompanyingKids") &&
      Object.prototype.hasOwnProperty.call(body, "accompanyingCount");

    if (usesLegacyCount) {
      accompanyingAdults = parseGuestCount(body.accompanyingCount);
      accompanyingKids = 0;
    }

    const response = body.response;
    if (response !== "YES" && response !== "NO" && response !== "MAYBE") {
      return NextResponse.json({ error: "Response must be YES, NO, or MAYBE." }, { status: 400 });
    }

    try {
      const signup = await prisma.eventSignup.create({
        data: {
          eventId,
          participantName,
          email,
          comment,
          accompanyingAdults,
          accompanyingKids,
          response,
        },
      });

      revalidateEventRoutes(eventId);
      await notifyAfterRsvp(
        req,
        {
          id: event.id,
          title: event.title,
          description: event.description,
          venue: event.venue,
          startsAt: event.startsAt,
          organizerEmail: event.organizerEmail ?? null,
        },
        {
          participantName,
          email,
          response,
          accompanyingAdults,
          accompanyingKids,
          comment,
        },
        eventId
      );
      return NextResponse.json({
        id: signup.id,
        message:
          "Thank you — your response has been recorded. Check your email for a confirmation and a Google Calendar link.",
      });
    } catch (createErr: unknown) {
      if (!isPrismaColumnMissing(createErr)) throw createErr;

      const legacyGuestTotal = accompanyingAdults + accompanyingKids;
      const id = randomUUID().replace(/-/g, "");
      const rows = (await prisma.$queryRaw(Prisma.sql`
        INSERT INTO "EventSignup" ("id", "eventId", "participantName", email, "accompanyingCount", response, "createdAt")
        VALUES (
          ${id},
          ${eventId},
          ${participantName},
          ${email},
          ${legacyGuestTotal},
          CAST(${response} AS "EventSignupResponse"),
          NOW()
        )
        RETURNING id
      `)) as Array<{ id: string }>;
      const row = rows[0];
      if (!row) {
        return NextResponse.json({ error: "Could not save sign-up." }, { status: 500 });
      }
      revalidateEventRoutes(eventId);
      await notifyAfterRsvp(
        req,
        {
          id: event.id,
          title: event.title,
          description: event.description,
          venue: event.venue,
          startsAt: event.startsAt,
          organizerEmail: event.organizerEmail ?? null,
        },
        {
          participantName,
          email,
          response,
          accompanyingAdults,
          accompanyingKids,
          comment,
        },
        eventId
      );
      return NextResponse.json({
        id: row.id,
        message:
          "Thank you — your response has been recorded. Check your email for a confirmation and a Google Calendar link.",
      });
    }
  } catch (e: unknown) {
    console.error("portal-events signup:", e);
    return NextResponse.json({ error: "Could not save sign-up." }, { status: 500 });
  }
}
