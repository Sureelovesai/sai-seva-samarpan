import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * GET /api/admin/seva-activities/[id]
 * Returns a single activity by id.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    const activity = await prisma.sevaActivity.findUnique({
      where: { id },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (e: unknown) {
    console.error("Admin seva-activities GET [id] error:", e);
    return NextResponse.json(
      { error: "Failed to load activity", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/seva-activities/[id]
 * Update an existing activity. Same fields as POST create.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    const body = await req.json();

    const existing = await prisma.sevaActivity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const updated = await prisma.sevaActivity.update({
      where: { id },
      data: {
        title: body.title != null ? String(body.title).trim() : undefined,
        category: body.category != null ? String(body.category).trim() || undefined : undefined,
        description: body.description != null ? String(body.description).trim() || undefined : undefined,

        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        startTime: body.startTime != null ? String(body.startTime).trim() || undefined : undefined,
        endTime: body.endTime != null ? String(body.endTime).trim() || undefined : undefined,
        durationHours:
          typeof body.durationHours === "number" && body.durationHours >= 0
            ? body.durationHours
            : body.durationHours === null || body.durationHours === ""
            ? null
            : undefined,

        city: body.city != null ? String(body.city).trim() : undefined,
        locationName: body.locationName != null ? String(body.locationName).trim() || undefined : undefined,
        address: body.address != null ? String(body.address).trim() || undefined : undefined,

        capacity: body.capacity !== undefined ? toIntOrNull(body.capacity) : undefined,

        coordinatorName: body.coordinatorName != null ? String(body.coordinatorName).trim() || undefined : undefined,
        coordinatorEmail: body.coordinatorEmail != null ? String(body.coordinatorEmail).trim() || undefined : undefined,
        coordinatorPhone: body.coordinatorPhone != null ? String(body.coordinatorPhone).trim() || undefined : undefined,

        imageUrl: body.imageUrl != null ? String(body.imageUrl).trim() || undefined : undefined,

        // When status is ARCHIVED (event cancelled), always set isActive = false so Active activities count updates
        isActive:
          body.status === "ARCHIVED"
            ? false
            : body.isActive === undefined
              ? undefined
              : Boolean(body.isActive),
        isFeatured: body.isFeatured === undefined ? undefined : Boolean(body.isFeatured),
        status:
          body.status === "DRAFT" || body.status === "PUBLISHED" || body.status === "ARCHIVED"
            ? body.status
            : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    console.error("Admin seva-activities PATCH [id] error:", e);
    return NextResponse.json(
      { error: "Failed to update activity", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
