import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isActivityEnded,
  getActivityEndMoment,
  signupCountsTowardImpactTotals,
} from "@/lib/activityEnded";

/**
 * GET /api/analytics
 * Returns aggregate stats, category/city counts, and recent activities.
 * Hours and volunteer counts from Seva Activities (Join Seva + bulk import): APPROVED while upcoming/in progress;
 * after the activity ends, everyone except REJECTED. Optional `center` filters by activity city (location).
 * Logged Hours are added only to the combined totalHours figure (unchanged); bulk import never writes LoggedHours.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const center = searchParams.get("center")?.trim() || undefined;
    const category = searchParams.get("category")?.trim() || undefined;
    const from = searchParams.get("from")?.trim() || undefined;
    const to = searchParams.get("to")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;

    const baseWhere: Record<string, unknown> = {};
    if (center && center !== "All") baseWhere.city = center;
    if (category && category !== "All") baseWhere.category = category;
    if (from || to) {
      baseWhere.startDate = {};
      if (from) (baseWhere.startDate as Record<string, unknown>).gte = new Date(from + "T00:00:00");
      if (to) (baseWhere.startDate as Record<string, unknown>).lte = new Date(to + "T23:59:59");
    }
    if (search) {
      // Wrap search in AND so it combines correctly with city/category/date filters
      const searchOr = {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      };
      baseWhere.AND = Array.isArray(baseWhere.AND) ? [...baseWhere.AND, searchOr] : [searchOr];
    }

    const activityDateSelect = {
      durationHours: true,
      endDate: true,
      startDate: true,
      endTime: true,
      startTime: true,
    };

    const loggedHoursWhere = {};

    const [
      totalActivities,
      activeActivities,
      signupsWithActivity,
      categoryGroups,
      cityGroups,
      recentActivities,
      loggedHoursSum,
    ] = await Promise.all([
      prisma.sevaActivity.count({ where: baseWhere }),
      prisma.sevaActivity.count({ where: { ...baseWhere, isActive: true } }),
      prisma.sevaSignup.findMany({
        where: baseWhere && Object.keys(baseWhere).length > 0 ? { activity: baseWhere } : undefined,
        select: { status: true, adultsCount: true, kidsCount: true, activity: { select: activityDateSelect } },
      }),
      prisma.sevaActivity.groupBy({
        by: ["category"],
        where: baseWhere,
        _count: { id: true },
      }),
      prisma.sevaActivity.groupBy({
        by: ["city"],
        where: baseWhere,
        _count: { id: true },
      }),
      prisma.sevaActivity.findMany({
        where: { ...baseWhere, status: "PUBLISHED" },
        take: 8,
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          title: true,
          category: true,
          city: true,
          startDate: true,
          status: true,
          listedAsCommunityOutreach: true,
        },
      }),
      prisma.loggedHours.aggregate({
        where: loggedHoursWhere,
        _sum: { hours: true },
      }).catch((e: unknown) => {
        if ((e as { code?: string })?.code === "P2021") return { _sum: { hours: null } };
        throw e;
      }),
    ]);

    let totalVolunteers = 0;
    let totalHours = 0;
    for (const s of signupsWithActivity) {
      if (!s.activity || !signupCountsTowardImpactTotals(s.status, s.activity)) continue;
      const participants = (s.adultsCount ?? 1) + (s.kidsCount ?? 0);
      totalVolunteers += participants;
      const h = s.activity.durationHours;
      if (typeof h === "number" && h > 0) totalHours += participants * h;
    }
    totalHours = Math.round((totalHours + (loggedHoursSum._sum?.hours ?? 0)) * 10) / 10;

    const categoryCounts: Record<string, number> = {};
    for (const g of categoryGroups) {
      categoryCounts[g.category] = g._count.id;
    }

    const cityCounts: Record<string, number> = {};
    for (const g of cityGroups) {
      cityCounts[g.city] = g._count.id;
    }

    const topCategory =
      categoryGroups.length > 0
        ? categoryGroups.reduce((a: (typeof categoryGroups)[number], b: (typeof categoryGroups)[number]) =>
            a._count.id >= b._count.id ? a : b
          ).category
        : null;
    const topCenter =
      cityGroups.length > 0
        ? cityGroups.reduce((a: (typeof cityGroups)[number], b: (typeof cityGroups)[number]) =>
            a._count.id >= b._count.id ? a : b
          ).city
        : null;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthCount = await prisma.sevaActivity.count({
      where: {
        ...baseWhere,
        isActive: true,
        createdAt: { gte: startOfMonth },
      },
    });

    // Monthly Seva hours (last 12 months): signup hours only. Ended activities bucket by end month; upcoming APPROVED by start month.
    const monthlySevaHours: { month: string; hours: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthStart = new Date(y, m, 1);
      const monthEnd = new Date(y, m + 1, 0, 23, 59, 59);
      const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;

      let hours = 0;
      for (const s of signupsWithActivity) {
        if (!s.activity || !signupCountsTowardImpactTotals(s.status, s.activity)) continue;
        const participants = (s.adultsCount ?? 1) + (s.kidsCount ?? 0);
        const dur = s.activity.durationHours;
        if (typeof dur !== "number" || dur <= 0) continue;

        const ended = isActivityEnded(s.activity);
        let inThisMonth = false;
        if (ended) {
          const endMoment = getActivityEndMoment(s.activity);
          if (endMoment && endMoment >= monthStart && endMoment <= monthEnd) inThisMonth = true;
        } else if (s.activity.startDate) {
          const sd = new Date(s.activity.startDate);
          if (!Number.isNaN(sd.getTime()) && sd.getFullYear() === y && sd.getMonth() === m) {
            inThisMonth = true;
          }
        }
        if (!inThisMonth) continue;
        hours += participants * dur;
      }
      monthlySevaHours.push({ month: monthKey, hours: Math.round(hours * 10) / 10 });
    }

    return NextResponse.json({
      totalActivities,
      activeActivities,
      totalVolunteers,
      totalHours,
      categoryCounts,
      cityCounts,
      topCategory,
      topCenter,
      thisMonthCount,
      monthlySevaHours,
      recentActivities: recentActivities.map((a: (typeof recentActivities)[number]) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        city: a.city,
        startDate: a.startDate,
        status: a.status,
        listedAsCommunityOutreach: a.listedAsCommunityOutreach,
      })),
    });
  } catch (e: unknown) {
    console.error("Analytics error:", e);
    return NextResponse.json(
      { error: "Failed to load analytics", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
