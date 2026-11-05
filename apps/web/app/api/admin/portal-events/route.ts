import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
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
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 });

    const venue = typeof body.venue === "string" ? body.venue.trim() : "";
    if (!venue) return NextResponse.json({ error: "Venue is required" }, { status: 400 });

    const city = typeof body.city === "string" ? body.city.trim() : "Charlotte";
    if (!city) return NextResponse.json({ error: "City is required" }, { status: 400 });

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
    const organizerEmail = (orgRaw || "").trim().toLowerCase() || null;

    const slotsData = Array.isArray(body.slots) ? body.slots : [];
    // Auto-enable hasSlots if slots are provided, otherwise use explicit value
    const hasSlots = slotsData.length > 0 || body.hasSlots === true;

    const event = await prisma.portalEvent.create({
      data: {
        title,
        description,
        venue,
        city,
        startsAt,
        heroImageUrl,
        flyerUrl,
        signupsEnabled,
        hasSlots,
        status,
        organizerEmail,
        slots: hasSlots && slotsData.length > 0 ? {
          create: slotsData.map((slot: any) => ({
            slotName: typeof slot.slotName === "string" ? slot.slotName : "",
            slotDate: slot.slotDate ? new Date(slot.slotDate) : null,
            startTime: typeof slot.startTime === "string" ? slot.startTime : "00:00",
            endTime: typeof slot.endTime === "string" ? slot.endTime : "00:00",
            capacity: typeof slot.capacity === "number" ? slot.capacity : null,
          })),
        } : undefined,
      },
      include: {
        slots: true,
      },
    });

    return NextResponse.json(event);
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error("POST portal-events error:", errorMsg);
    console.error("Full error:", e);
    
    // Check for common Prisma errors
    if (errorMsg.includes("slotDate") || errorMsg.includes("EventSlot")) {
      return NextResponse.json({ 
        error: "Event slot database error. Please try again or contact support.",
        details: errorMsg 
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: "Failed to create event", details: errorMsg }, { status: 500 });
  }
}
