import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await prisma.portalEvent.findUnique({
    where: { id },
    include: {
      _count: { select: { signups: true } },
      slots: {
        select: {
          id: true,
          slotName: true,
          slotDate: true,
          startTime: true,
          endTime: true,
          capacity: true,
          items: {
            select: {
              id: true,
              name: true,
              category: true,
              neededLabel: true,
              maxQuantity: true,
            },
          },
        },
        orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
      },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.portalEvent.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    type Patch = {
      title?: string;
      description?: string;
      venue?: string;
      city?: string;
      startsAt?: Date;
      /** Clear so the ~24h cron can run again for the new start time. */
      reminderSentAt?: null;
      heroImageUrl?: string | null;
      flyerUrl?: string | null;
      signupsEnabled?: boolean;
      hasSlots?: boolean;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      organizerEmail?: string | null;
    };
    const data: Patch = {};

    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (typeof body.description === "string") data.description = body.description.trim();
    if (typeof body.venue === "string") data.venue = body.venue.trim();
    if (typeof body.city === "string" && body.city.trim()) data.city = body.city.trim();
    if (body.startsAt !== undefined) {
      if (typeof body.startsAt !== "string" || !body.startsAt.trim()) {
        return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
      }
      const d = new Date(body.startsAt);
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
      data.startsAt = d;
      if (existing.startsAt.getTime() !== d.getTime()) {
        data.reminderSentAt = null;
      }
    }
    if (body.heroImageUrl !== undefined) {
      data.heroImageUrl =
        typeof body.heroImageUrl === "string" && body.heroImageUrl.trim()
          ? body.heroImageUrl.trim()
          : null;
    }
    if (body.flyerUrl !== undefined) {
      data.flyerUrl =
        typeof body.flyerUrl === "string" && body.flyerUrl.trim() ? body.flyerUrl.trim() : null;
    }
    if (typeof body.signupsEnabled === "boolean") data.signupsEnabled = body.signupsEnabled;
    if (body.status === "DRAFT" || body.status === "PUBLISHED" || body.status === "ARCHIVED") {
      data.status = body.status;
    }
    if (body.organizerEmail !== undefined) {
      if (body.organizerEmail === null || body.organizerEmail === "") {
        data.organizerEmail = null;
      } else if (typeof body.organizerEmail === "string" && body.organizerEmail.trim()) {
        data.organizerEmail = body.organizerEmail.trim().toLowerCase();
      }
    }
    if (typeof body.hasSlots === "boolean") {
      data.hasSlots = body.hasSlots;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Handle slots update if provided
    if (Array.isArray(body.slots)) {
      // Delete existing slots first (cascade deletes items via FK)
      await prisma.eventSlot.deleteMany({ where: { eventId: id } });
      // Create new slots if any provided
      if (body.slots.length > 0) {
        for (const slot of body.slots) {
          // Parse slotDate safely - only create Date if it's a non-empty string
          let slotDate = null;
          if (typeof slot.slotDate === "string" && slot.slotDate.trim()) {
            const parsedDate = new Date(`${slot.slotDate}T00:00:00`);
            if (!isNaN(parsedDate.getTime())) {
              slotDate = parsedDate;
            }
          }

          const createdSlot = await prisma.eventSlot.create({
            data: {
              eventId: id,
              slotName: typeof slot.slotName === "string" ? slot.slotName : "",
              slotDate,
              startTime: typeof slot.startTime === "string" ? slot.startTime : "00:00",
              endTime: typeof slot.endTime === "string" ? slot.endTime : "00:00",
              capacity: typeof slot.capacity === "number" ? slot.capacity : null,
            },
          });

          // Create items for this slot if provided
          if (Array.isArray(slot.items) && slot.items.length > 0) {
            await prisma.eventItem.createMany({
              data: slot.items.map((item: any) => ({
                slotId: createdSlot.id,
                name: typeof item.name === "string" ? item.name.trim() : "",
                category: typeof item.category === "string" ? item.category.trim() : "",
                neededLabel: typeof item.neededLabel === "string" ? item.neededLabel.trim() : "",
                maxQuantity: typeof item.maxQuantity === "number" ? Math.max(1, item.maxQuantity) : 1,
              })),
            });
          }
        }
        // Auto-enable hasSlots if slots were provided
        data.hasSlots = true;
      } else if (body.hasSlots === false) {
        // If slots array is empty and hasSlots is explicitly false, disable slots
        data.hasSlots = false;
      }
    } else if (body.hasSlots === false) {
      // Delete all slots if hasSlots is explicitly turned off (cascade deletes items)
      await prisma.eventSlot.deleteMany({ where: { eventId: id } });
    }

    const event = await prisma.portalEvent.update({
      where: { id },
      data,
      include: {
        slots: true,
      },
    });
    return NextResponse.json(event);
  } catch (e: unknown) {
    console.error("PATCH portal-events/[id]:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Check authentication and authorization
    const cookieHeader = req.headers.get("cookie") ?? null;
    const sessionWithRole = await getSessionWithRole(cookieHeader);
    
    if (!sessionWithRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and EVENT_ADMIN roles can delete events
    const hasPermission = sessionWithRole.roles?.includes("ADMIN") || 
                          sessionWithRole.roles?.includes("EVENT_ADMIN");
    
    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden: Only admins can delete events" }, { status: 403 });
    }

    // Event admins with city restrictions can only delete events in their cities
    if (sessionWithRole.roles?.includes("EVENT_ADMIN") && 
        !sessionWithRole.roles?.includes("ADMIN") &&
        sessionWithRole.coordinatorCities) {
      const event = await prisma.portalEvent.findUnique({ where: { id } });
      if (event && !sessionWithRole.coordinatorCities.includes(event.city)) {
        return NextResponse.json({ 
          error: "Forbidden: You can only delete events in your assigned cities" 
        }, { status: 403 });
      }
    }

    await prisma.portalEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("DELETE portal-events/[id]:", e);
    return NextResponse.json({ error: "Not found or could not delete" }, { status: 404 });
  }
}
