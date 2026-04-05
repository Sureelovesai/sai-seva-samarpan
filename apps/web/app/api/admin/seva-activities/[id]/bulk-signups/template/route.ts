import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole } from "@/lib/getRole";
import { buildSevaActivityWorkbookBuffer } from "@/lib/sevaExcelWorkbook";

/**
 * GET /api/admin/seva-activities/[id]/bulk-signups/template
 * Download workbook: Instructions, Add Seva Activity, Contribution items, Join Seva Activity.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(session, "ADMIN", "SEVA_COORDINATOR")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Activity ID required" }, { status: 400 });

    const activity = await prisma.sevaActivity.findUnique({
      where: { id },
      include: {
        contributionItems: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, maxQuantity: true },
        },
        signups: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            volunteerName: true,
            email: true,
            phone: true,
            adultsCount: true,
            kidsCount: true,
            status: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    });

    if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

    if (session.role === "SEVA_COORDINATOR" && session.coordinatorCities?.length) {
      const allowed = session.coordinatorCities.some(
        (c) => c.trim().toLowerCase() === (activity.city ?? "").toLowerCase()
      );
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const itemIds = activity.contributionItems.map((it: { id: string }) => it.id);
    const claims =
      itemIds.length > 0
        ? await prisma.sevaContributionClaim.findMany({
            where: { itemId: { in: itemIds } },
            select: { itemId: true, email: true, quantity: true, status: true },
          })
        : [];

    const filledByItem = new Map<string, number>();
    for (const c of claims) {
      if (c.status === "CANCELLED") continue;
      filledByItem.set(c.itemId, (filledByItem.get(c.itemId) ?? 0) + c.quantity);
    }

    const buf = await buildSevaActivityWorkbookBuffer({
      mode: "filled",
      activity: {
        id: activity.id,
        title: activity.title,
        category: activity.category,
        description: activity.description,
        capacity: activity.capacity,
        startDate: activity.startDate,
        endDate: activity.endDate,
        startTime: activity.startTime,
        endTime: activity.endTime,
        durationHours: activity.durationHours,
        city: activity.city,
        organizationName: activity.organizationName,
        locationName: activity.locationName,
        address: activity.address,
        coordinatorName: activity.coordinatorName,
        coordinatorEmail: activity.coordinatorEmail,
        coordinatorPhone: activity.coordinatorPhone,
        isActive: activity.isActive,
        isFeatured: activity.isFeatured,
        listedAsCommunityOutreach: activity.listedAsCommunityOutreach,
        status: activity.status,
        imageUrl: activity.imageUrl,
      },
      items: activity.contributionItems.map(
        (it: { id: string; name: string; maxQuantity: number }) => ({
          id: it.id,
          name: it.name,
          maxQuantity: it.maxQuantity,
          filledQuantity: filledByItem.get(it.id) ?? 0,
        })
      ),
      signups: activity.signups.map(
        (s: {
          id: string;
          volunteerName: string;
          email: string;
          phone: string | null;
          adultsCount: number;
          kidsCount: number;
          status: string;
          comment: string | null;
          createdAt: Date;
        }) => ({
          id: s.id,
          volunteerName: s.volunteerName,
          email: s.email,
          phone: s.phone,
          adultsCount: s.adultsCount,
          kidsCount: s.kidsCount,
          status: s.status,
          comment: s.comment,
          createdAt: s.createdAt,
        })
      ),
      claims: claims.map(
        (c: { itemId: string; email: string; quantity: number; status: string }) => ({
          itemId: c.itemId,
          email: c.email,
          quantity: c.quantity,
          status: c.status,
        })
      ),
    });

    const filename = `seva-activity-workbook-${id.slice(0, 8)}.xlsx`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: unknown) {
    console.error("bulk-signups template GET error:", e);
    return NextResponse.json(
      { error: "Failed to build template", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
