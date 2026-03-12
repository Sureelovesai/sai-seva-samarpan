import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole, activityCityWhere } from "@/lib/getRole";
import { isActivityEnded, isSignupCounted } from "@/lib/activityEnded";

/**
 * GET /api/admin/dashboard-stats
 * Total hours, total volunteers, active activities, total activities from Seva Activities only (Join Seva Activity).
 * Does NOT include Logged Hours from the Log Hours page.
 * For Seva Coordinator, all counts are restricted to their cities (unchanged).
 * Admin, Blog Admin, and Seva Coordinator can access.
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(session, "ADMIN", "SEVA_COORDINATOR", "BLOG_ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const cityFilter =
      session.role === "SEVA_COORDINATOR" && session.coordinatorCities?.length
        ? activityCityWhere(session.coordinatorCities)
        : undefined;

    const activityWhere = cityFilter ?? {};

    const activityDateSelect = {
      durationHours: true,
      endDate: true,
      startDate: true,
      endTime: true,
      startTime: true,
    };

    const [totalActivities, activeActivities, signupsWithActivity, categoryGroups, recentSignups] =
      await Promise.all([
        prisma.sevaActivity.count({ where: activityWhere }),
        prisma.sevaActivity.count({ where: { ...activityWhere, isActive: true } }),
        cityFilter
          ? prisma.sevaSignup.findMany({
              where: { activity: activityWhere },
              select: { status: true, adultsCount: true, kidsCount: true, activity: { select: activityDateSelect } },
            })
          : prisma.sevaSignup.findMany({
              select: { status: true, adultsCount: true, kidsCount: true, activity: { select: activityDateSelect } },
            }),
        prisma.sevaActivity.groupBy({
          where: activityWhere,
          by: ["category"],
          _count: { id: true },
        }),
        prisma.sevaSignup.findMany({
          where: cityFilter ? { activity: activityWhere } : undefined,
          take: 3,
          orderBy: { createdAt: "desc" },
          include: { activity: { select: { title: true } } },
        }),
      ]);

    let totalHours = 0;
    let totalVolunteers = 0;
    for (const s of signupsWithActivity) {
      if (!s.activity || !isActivityEnded(s.activity)) continue;
      if (!isSignupCounted(s.status, true)) continue; // activity ended: only exclude REJECTED, keep CANCELLED so we don't lose hours
      const participants = (s.adultsCount ?? 1) + (s.kidsCount ?? 0);
      totalVolunteers += participants;
      const h = s.activity.durationHours;
      if (typeof h === "number" && h > 0) totalHours += participants * h;
    }
    totalHours = Math.round(totalHours * 10) / 10;

    const categoryCounts: Record<string, number> = {};
    for (const g of categoryGroups) {
      categoryCounts[g.category] = g._count.id;
    }

    return NextResponse.json({
      totalActivities,
      activeActivities,
      totalVolunteers,
      totalHours,
      categoryCounts,
      recentSignups: recentSignups.map((s: (typeof recentSignups)[number]) => ({
        id: s.id,
        volunteerName: s.volunteerName,
        email: s.email,
        phone: s.phone,
        status: s.status,
        createdAt: s.createdAt,
        activityTitle: s.activity?.title ?? "—",
        adultsCount: s.adultsCount ?? 1,
        kidsCount: s.kidsCount ?? 0,
      })),
    });
  } catch (e: unknown) {
    console.error("Dashboard stats error:", e);
    return NextResponse.json(
      { error: "Failed to load stats", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
