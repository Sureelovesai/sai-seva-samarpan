import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import {
  allCommunityOutreachActivitiesWhere,
  getApprovedCommunityProfile,
  isCommunityOutreachSiteAdmin,
  orgActivityWhere,
} from "@/lib/communityOutreachOwnership";

export const dynamic = "force-dynamic";

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
 * GET /api/community-outreach/signups
 * Sign-ups for activities owned by this Community Outreach org (optional filters).
 * Query: activityId, status, fromDate, toDate
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getApprovedCommunityProfile(session.sub);
    const isAdmin = isCommunityOutreachSiteAdmin(session);
    if (!profile && !isAdmin) {
      return NextResponse.json(
        { error: "Your organization profile must be approved to view sign-ups." },
        { status: 403 }
      );
    }

    const orgActivities = await prisma.sevaActivity.findMany({
      where: isAdmin ? allCommunityOutreachActivitiesWhere() : orgActivityWhere(profile!),
      select: { id: true },
    });
    const allowedIds = orgActivities.map((a: { id: string }) => a.id);
    if (allowedIds.length === 0) {
      return NextResponse.json({
        signups: [],
        itemContributions: [],
        itemContributionSummary: null,
      });
    }

    const { searchParams } = new URL(req.url);
    const activityIdParam = searchParams.get("activityId") || undefined;
    const status = searchParams.get("status") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    if (activityIdParam && !allowedIds.includes(activityIdParam)) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const where: {
      activityId?: string | { in: string[] };
      status?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (activityIdParam) {
      where.activityId = activityIdParam;
    } else {
      where.activityId = { in: allowedIds };
    }

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
        activity: { select: { id: true, title: true, city: true, organizationName: true } },
      },
    });

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

    const activityId = activityIdParam;
    if (activityId) {
      const act = await prisma.sevaActivity.findFirst({
        where: isAdmin
          ? { id: activityId, ...allCommunityOutreachActivitiesWhere() }
          : { id: activityId, ...orgActivityWhere(profile!) },
        select: { id: true },
      });

      if (act) {
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
  } catch (e: unknown) {
    console.error("community-outreach signups GET error:", e);
    return NextResponse.json(
      { error: "Failed to load sign-ups", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
