import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getContributionItemsWithFilled } from "@/lib/syncSevaContributionItems";
import { isActivityEnded } from "@/lib/activityEnded";

/**
 * GET /api/seva-activities/[id]/contributions
 * Public: item list with filled / max quantities (no volunteer PII).
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
      select: {
        id: true,
        isActive: true,
        status: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        durationHours: true,
      },
    });

    if (!activity || !activity.isActive || activity.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    if (isActivityEnded(activity)) {
      return NextResponse.json({ items: [], ended: true });
    }

    const rows = await getContributionItemsWithFilled(id);
    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      neededLabel: r.neededLabel,
      maxQuantity: r.maxQuantity,
      filledQuantity: r.filledQuantity,
      remaining: Math.max(0, r.maxQuantity - r.filledQuantity),
    }));

    return NextResponse.json({ items, ended: false });
  } catch (e: unknown) {
    console.error("GET contributions error:", e);
    return NextResponse.json(
      { error: "Failed to load contributions", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
