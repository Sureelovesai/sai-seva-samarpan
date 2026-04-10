import type { Prisma } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const activityPublicSelect = {
  id: true,
  title: true,
  category: true,
  description: true,
  city: true,
  startDate: true,
  endDate: true,
  startTime: true,
  endTime: true,
  durationHours: true,
  locationName: true,
  organizationName: true,
  address: true,
  capacity: true,
  coordinatorName: true,
  coordinatorEmail: true,
  coordinatorPhone: true,
  imageUrl: true,
  isActive: true,
  isFeatured: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SevaActivitySelect;

/**
 * GET /api/community-activities/[id]
 * One published, active community-outreach activity (same shape as list API).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Activity id required" }, { status: 400 });
    }

    const activity = await prisma.sevaActivity.findFirst({
      where: {
        id: id.trim(),
        listedAsCommunityOutreach: true,
        isActive: true,
        status: "PUBLISHED",
      },
      select: activityPublicSelect,
    });

    if (!activity) {
      return NextResponse.json({ error: "Community activity not found" }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (e: unknown) {
    console.error("GET community-activities/[id]:", e);
    return NextResponse.json(
      { error: "Failed to load activity", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
