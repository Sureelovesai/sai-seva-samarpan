import type { Prisma } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isActivityEnded } from "@/lib/activityEnded";

/**
 * POST /api/seva-activities/[id]/contributions/claim
 * Body: { itemId, quantity?, volunteerName, email, phone? }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    if (!activityId) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
    const volunteerName = typeof body.volunteerName === "string" ? body.volunteerName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
    const quantity = Math.max(1, Math.floor(Number(body.quantity) || 1));

    if (!itemId || !volunteerName || !email) {
      return NextResponse.json(
        { error: "itemId, volunteerName, and email are required" },
        { status: 400 }
      );
    }

    const activity = await prisma.sevaActivity.findUnique({
      where: { id: activityId },
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
      return NextResponse.json(
        { error: "This activity has ended; item sign-up is closed." },
        { status: 400 }
      );
    }

    const item = await prisma.sevaContributionItem.findFirst({
      where: { id: itemId, activityId },
    });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const agg = await tx.sevaContributionClaim.aggregate({
        where: { itemId, status: "CONFIRMED" },
        _sum: { quantity: true },
      });
      const filled = agg._sum.quantity ?? 0;
      const remaining = item.maxQuantity - filled;
      if (quantity > remaining) {
        return {
          ok: false as const,
          error:
            remaining <= 0
              ? "This item is fully covered. Thank you!"
              : `Only ${remaining} unit(s) still needed for this item.`,
        };
      }

      const claim = await tx.sevaContributionClaim.create({
        data: {
          itemId,
          quantity,
          volunteerName,
          email,
          phone,
          status: "CONFIRMED",
        },
      });
      return { ok: true as const, claim, filledAfter: filled + quantity };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      claimId: result.claim.id,
      filledQuantity: result.filledAfter,
      maxQuantity: item.maxQuantity,
    });
  } catch (e: unknown) {
    console.error("POST contribution claim error:", e);
    return NextResponse.json(
      { error: "Failed to save sign-up", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
