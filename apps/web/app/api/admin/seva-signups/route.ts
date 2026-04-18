import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import {
  adminSevaActivityListWhere,
  sessionCanAccessAdminSevaActivity,
} from "@/lib/sevaCoordinatorActivityAccess";

/** Shape of contribution items + confirmed claims returned for admin sign-ups view */
type ContributionClaimRow = {
  id: string;
  volunteerName: string;
  email: string;
  phone: string | null;
  quantity: number;
  createdAt: Date;
};
type ContributionItemWithClaims = {
  id: string;
  name: string;
  category: string;
  neededLabel: string;
  maxQuantity: number;
  claims: ContributionClaimRow[];
};

/**
 * GET /api/admin/seva-signups
 * List sign-ups with optional filters.
 * Query: activityId, status (PENDING|APPROVED|REJECTED|CANCELLED), fromDate (yyyy-mm-dd), toDate (yyyy-mm-dd)
 * Requires Admin or Seva Coordinator. For Seva Coordinator, only signups for activities in their cities.
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get("activityId") || undefined;
    const status = searchParams.get("status") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    const where: any = {};

    const scopeW = adminSevaActivityListWhere(session);
    if (scopeW) {
      where.activity = scopeW;
    }
    if (activityId) where.activityId = activityId;
    if (status && ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
      where.status = status;
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate + "T00:00:00.000Z");
      if (toDate) where.createdAt.lte = new Date(toDate + "T23:59:59.999Z");
    }

    const signups = await prisma.sevaSignup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        activity: { select: { id: true, title: true } },
      },
    });

    // Item contributions (things volunteers signed up to bring) — scoped to selected activity
    type ItemContribRow = {
      id: string;
      volunteerName: string;
      email: string;
      phone: string | null;
      quantity: number;
      itemId: string;
      itemName: string;
      itemCategory: string;
      neededLabel: string;
      maxQuantity: number;
      createdAt: string;
    };

    let itemContributions: ItemContribRow[] = [];
    let itemContributionSummary: {
      activityId: string;
      totalClaimRows: number;
      byItem: Array<{
        itemId: string;
        name: string;
        category: string;
        neededLabel: string;
        maxQuantity: number;
        filledQuantity: number;
      }>;
    } | null = null;

    if (activityId) {
      const act = await prisma.sevaActivity.findUnique({
        where: { id: activityId },
        select: { id: true, scope: true, city: true, sevaUsaRegion: true },
      });
      const activityOk = act && sessionCanAccessAdminSevaActivity(session, act);

      if (activityOk) {
        const items = (await prisma.sevaContributionItem.findMany({
          where: { activityId },
          orderBy: { sortOrder: "asc" },
          include: {
            claims: {
              where: { status: "CONFIRMED" },
              orderBy: { createdAt: "desc" },
            },
          },
        })) as ContributionItemWithClaims[];

        itemContributions = items.flatMap((item) =>
          item.claims.map((c: ContributionClaimRow) => ({
            id: c.id,
            volunteerName: c.volunteerName,
            email: c.email,
            phone: c.phone,
            quantity: c.quantity,
            itemId: item.id,
            itemName: item.name,
            itemCategory: item.category,
            neededLabel: item.neededLabel,
            maxQuantity: item.maxQuantity,
            createdAt: c.createdAt.toISOString(),
          }))
        );

        itemContributionSummary = {
          activityId,
          totalClaimRows: itemContributions.length,
          byItem: items.map((item) => ({
            itemId: item.id,
            name: item.name,
            category: item.category,
            neededLabel: item.neededLabel,
            maxQuantity: item.maxQuantity,
            filledQuantity: item.claims.reduce((s: number, c: ContributionClaimRow) => s + c.quantity, 0),
          })),
        };
      }
    }

    return NextResponse.json({
      signups,
      itemContributions,
      itemContributionSummary,
    });
  } catch (e: any) {
    console.error("Admin seva-signups GET error:", e);
    return NextResponse.json(
      { error: "Failed to load sign-ups", detail: e?.message },
      { status: 500 }
    );
  }
}
