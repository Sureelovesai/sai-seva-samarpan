import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManagePortalEvents, getSessionWithRole } from "@/lib/getRole";

function canManage(session: Awaited<ReturnType<typeof getSessionWithRole>>) {
  return canManagePortalEvents(session);
}

export async function GET(req: Request) {
  const session = await getSessionWithRole(req.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: { status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" } = {};
  if (status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED") {
    where.status = status;
  }

  const items = await prisma.portalEvent.findMany({
    where,
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { signups: true } } },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManage(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 });

    const venue = typeof body.venue === "string" ? body.venue.trim() : "";
    if (!venue) return NextResponse.json({ error: "Venue is required" }, { status: 400 });

    const startsAtRaw = body.startsAt;
    if (!startsAtRaw || typeof startsAtRaw !== "string") {
      return NextResponse.json({ error: "startsAt (ISO date-time) is required" }, { status: 400 });
    }
    const startsAt = new Date(startsAtRaw);
    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
    }

    const heroImageUrl =
      typeof body.heroImageUrl === "string" && body.heroImageUrl.trim() ? body.heroImageUrl.trim() : null;
    const flyerUrl =
      typeof body.flyerUrl === "string" && body.flyerUrl.trim() ? body.flyerUrl.trim() : null;

    const signupsEnabled = body.signupsEnabled !== false;

    const status =
      body.status === "PUBLISHED" || body.status === "ARCHIVED" || body.status === "DRAFT"
        ? body.status
        : "PUBLISHED";

    const orgRaw = typeof body.organizerEmail === "string" ? body.organizerEmail.trim() : "";
    const organizerEmail = (orgRaw || session.email || "").trim().toLowerCase() || null;

    const event = await prisma.portalEvent.create({
      data: {
        title,
        description,
        venue,
        startsAt,
        heroImageUrl,
        flyerUrl,
        signupsEnabled,
        status,
        organizerEmail,
      },
    });

    return NextResponse.json(event);
  } catch (e: unknown) {
    console.error("POST portal-events:", e);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
