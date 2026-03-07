import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isActivityEnded, isSignupCounted } from "@/lib/activityEnded";

/**
 * GET /api/impact-stats
 * Home page stats: hours, volunteers, and activities from Seva Activities only (Join Seva Activity).
 * Does NOT include Logged Hours from the Log Hours page.
 * - Hours = sum of activity.durationHours for signups where the activity has ended.
 * - Volunteers = count of those signups.
 * - Activities = count of active Seva activities.
 */
export async function GET() {
  try {
    const [activitiesCount, signupsWithActivity] = await Promise.all([
      prisma.sevaActivity.count({ where: { isActive: true } }),
      prisma.sevaSignup.findMany({
        select: {
          status: true,
          activity: {
            select: {
              durationHours: true,
              endDate: true,
              startDate: true,
              endTime: true,
              startTime: true,
            },
          },
        },
      }),
    ]);

    // Only count signups for activities that have ended (finished). When ended, count even CANCELLED (so we don't lose hours if cancelled after)
    let totalHours = 0;
    let volunteerCount = 0;
    for (const s of signupsWithActivity) {
      if (!s.activity || !isActivityEnded(s.activity)) continue;
      if (!isSignupCounted(s.status, true)) continue; // true = activity ended, only exclude REJECTED
      volunteerCount += 1;
      const h = s.activity.durationHours;
      if (typeof h === "number" && h > 0) totalHours += h;
    }
    totalHours = Math.round(totalHours * 10) / 10;

    return NextResponse.json({
      activities: activitiesCount,
      volunteers: volunteerCount,
      hours: totalHours,
    });
  } catch (e: unknown) {
    console.error("Impact stats error:", e);
    return NextResponse.json({ error: "Failed to load impact stats", detail: (e as Error)?.message }, { status: 500 });
  }
}
