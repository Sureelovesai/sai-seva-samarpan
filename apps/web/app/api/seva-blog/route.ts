import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isActivityEnded, isSignupCounted } from "@/lib/activityEnded";

const PUBLISHED = "PUBLISHED" as const;

/**
 * GET /api/seva-blog
 * Returns data for the Seva Blog (Sai Heart Beats style): featured activity, list, impact stats, popular tags.
 * Impact hours and volunteers are from Seva Activities only (Join Seva Activity, after activity ended). No Logged Hours.
 */
export async function GET() {
  try {
    const activityWhere = {
      status: PUBLISHED,
      isActive: true,
    };

    const activityDateSelect = {
      durationHours: true,
      endDate: true,
      startDate: true,
      endTime: true,
      startTime: true,
    };

    const [featured, activitiesList, impactData, categoryCounts] = await Promise.all([
      // One featured activity (isFeatured, published); need date fields for volunteerCount (only count when activity ended)
      prisma.sevaActivity.findFirst({
        where: { ...activityWhere, isFeatured: true },
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          city: true,
          imageUrl: true,
          startDate: true,
          endDate: true,
          endTime: true,
          startTime: true,
          durationHours: true,
          isFeatured: true,
          createdAt: true,
          signups: { select: { id: true, status: true } },
        },
      }),
      // Other published activities for grid (exclude featured id later), take 5 for grid
      prisma.sevaActivity.findMany({
        where: activityWhere,
        orderBy: { startDate: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          city: true,
          imageUrl: true,
          startDate: true,
          endDate: true,
          endTime: true,
          startTime: true,
          durationHours: true,
          isFeatured: true,
          createdAt: true,
          signups: { select: { id: true, status: true } },
        },
      }),
      // Impact: hours and volunteers only from Seva Activity signups (activities that have ended). No Logged Hours.
      (async () => {
        const [signupsWithActivity, activitiesCount, centersResult] = await Promise.all([
          prisma.sevaSignup.findMany({
            select: { status: true, activity: { select: activityDateSelect } },
          }),
          prisma.sevaActivity.count({ where: { ...activityWhere } }),
          prisma.sevaActivity.groupBy({
            by: ["city"],
            where: activityWhere,
          }),
        ]);
        let totalHours = 0;
        let volunteerCount = 0;
        for (const s of signupsWithActivity) {
          if (!s.activity || !isActivityEnded(s.activity)) continue;
          if (!isSignupCounted(s.status, true)) continue; // activity ended: only exclude REJECTED
          volunteerCount += 1;
          const h = s.activity.durationHours;
          if (typeof h === "number" && h > 0) totalHours += h;
        }
        const hours = Math.round(totalHours * 10) / 10;
        return {
          hours,
          volunteers: volunteerCount,
          familiesServed: activitiesCount,
          centers: centersResult.length,
        };
      })(),
      // Popular tags: category counts
      prisma.sevaActivity.groupBy({
        by: ["category"],
        where: activityWhere,
        _count: { category: true },
        orderBy: { _count: { category: "desc" } },
      }),
    ]);

    // Build grid: if we have a featured, use it as first and then 4 more (excluding featured); else first 4
    const featuredId = featured?.id;
    const forGrid = activitiesList.filter((a: (typeof activitiesList)[number]) => a.id !== featuredId).slice(0, 4);
    const popularTags = categoryCounts.map((c: (typeof categoryCounts)[number]) => ({
      name: c.category,
      count: c._count.category,
    }));

    const volunteerCountFor = (activity: {
      endDate?: Date | null;
      startDate?: Date | null;
      endTime?: string | null;
      startTime?: string | null;
      durationHours?: number | null;
      signups: { status: string }[];
    }) =>
      isActivityEnded(activity)
        ? activity.signups.filter((s) => isSignupCounted(s.status, true)).length
        : 0;

    return NextResponse.json({
      featured: featured
        ? {
            id: featured.id,
            title: featured.title,
            description: featured.description ?? "",
            category: featured.category,
            city: featured.city,
            imageUrl: featured.imageUrl,
            startDate: featured.startDate,
            durationHours: featured.durationHours,
            volunteerCount: volunteerCountFor(featured),
            createdAt: featured.createdAt,
          }
        : null,
      activities: forGrid.map((a: (typeof forGrid)[number]) => ({
        id: a.id,
        title: a.title,
        description: a.description ?? "",
        category: a.category,
        city: a.city,
        imageUrl: a.imageUrl,
        startDate: a.startDate,
        volunteerCount: volunteerCountFor(a),
        createdAt: a.createdAt,
      })),
      impact: impactData,
      popularTags,
    });
  } catch (e: unknown) {
    console.error("Seva blog API error:", e);
    return NextResponse.json(
      { error: "Failed to load blog data", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
