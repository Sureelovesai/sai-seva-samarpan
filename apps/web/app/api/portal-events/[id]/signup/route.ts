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

function splitParticipantName(full: string): { firstName: string; lastName: string } {
  const t = full.trim().replace(/\s+/g, " ");
  if (!t) return { firstName: "", lastName: "" };
  const parts = t.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const event = await prisma.portalEvent.findFirst({
      where: { id: eventId, status: "PUBLISHED" },
      select: { id: true, signupsEnabled: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const url = new URL(req.url);
    const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    try {
      const existing = await prisma.eventSignup.findFirst({
        where: { eventId, email },
        orderBy: { createdAt: "desc" },
        select: {
          participantName: true,
          email: true,
          response: true,
          accompanyingAdults: true,
          accompanyingKids: true,
          comment: true,
        },
      });
      if (!existing) {
        return NextResponse.json({ error: "No RSVP found for this email on this event." }, { status: 404 });
      }
      const split = splitParticipantName(existing.participantName);
      return NextResponse.json({
        firstName: split.firstName,
        lastName: split.lastName,
        email: existing.email,
        response: existing.response,
        accompanyingAdults: existing.accompanyingAdults,
        accompanyingKids: existing.accompanyingKids,
        comment: existing.comment ?? "",
      });
    } catch (readErr: unknown) {
      if (!isPrismaColumnMissing(readErr)) throw readErr;
      const rows = (await prisma.$queryRaw(Prisma.sql`
        SELECT "participantName", email, response, "accompanyingCount"
        FROM "EventSignup"
        WHERE "eventId" = ${eventId} AND email = ${email}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `)) as Array<{
        participantName: string;
        email: string;
        response: "YES" | "NO" | "MAYBE";
        accompanyingCount: number;
      }>;
      const existing = rows[0];
      if (!existing) {
        return NextResponse.json({ error: "No RSVP found for this email on this event." }, { status: 404 });
      }
      const split = splitParticipantName(existing.participantName);
      return NextResponse.json({
        firstName: split.firstName,
        lastName: split.lastName,
        email: existing.email,
        response: existing.response,
        accompanyingAdults: Math.max(0, Number(existing.accompanyingCount) || 0),
        accompanyingKids: 0,
        comment: "",
      });
    }
  } catch (e: unknown) {
    console.error("portal-events signup GET:", e);
    return NextResponse.json({ error: "Could not load RSVP." }, { status: 500 });
  }
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
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    if (!firstName || firstName.length > 100) {
      return NextResponse.json(
        { error: "First name is required (max 100 characters)." },
        { status: 400 }
      );
    }
    if (!lastName || lastName.length > 100) {
      return NextResponse.json(
        { error: "Last name is required (max 100 characters)." },
        { status: 400 }
      );
    }
    const participantName = `${firstName} ${lastName}`.trim();
    if (participantName.length > 200) {
      return NextResponse.json(
        { error: "First and last name together must be at most 200 characters." },
        { status: 400 }
      );
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
      const existing = await prisma.eventSignup.findFirst({
        where: { eventId, email },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });
      const signup = existing
        ? await prisma.eventSignup.update({
            where: { id: existing.id },
            data: {
              participantName,
              email,
              comment,
              accompanyingAdults,
              accompanyingKids,
              response,
            },
          })
        : await prisma.eventSignup.create({
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
          "Sai Ram! Thank you for registering. We look forward to your presence at the center event.",
      });
    } catch (createErr: unknown) {
      if (!isPrismaColumnMissing(createErr)) throw createErr;

      const legacyGuestTotal = accompanyingAdults + accompanyingKids;
      const existingRows = (await prisma.$queryRaw(Prisma.sql`
        SELECT id
        FROM "EventSignup"
        WHERE "eventId" = ${eventId} AND email = ${email}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `)) as Array<{ id: string }>;
      const existing = existingRows[0];
      let row: { id: string } | undefined;
      if (existing?.id) {
        const updated = (await prisma.$queryRaw(Prisma.sql`
          UPDATE "EventSignup"
          SET
            "participantName" = ${participantName},
            email = ${email},
            "accompanyingCount" = ${legacyGuestTotal},
            response = CAST(${response} AS "EventSignupResponse")
          WHERE id = ${existing.id}
          RETURNING id
        `)) as Array<{ id: string }>;
        row = updated[0];
      } else {
        const id = randomUUID().replace(/-/g, "");
        const inserted = (await prisma.$queryRaw(Prisma.sql`
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
        row = inserted[0];
      }
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
          "Sai Ram! Thank you for registering. We look forward to your presence at the center event.",
      });
    }
  } catch (e: unknown) {
    console.error("portal-events signup:", e);
    return NextResponse.json({ error: "Could not save sign-up." }, { status: 500 });
  }
}
