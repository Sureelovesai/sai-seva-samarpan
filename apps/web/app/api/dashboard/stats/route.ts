import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth";

/**
 * GET /api/dashboard/stats
 * My Seva Dashboard stats for the logged-in person (by email). Query: email (optional); if omitted, uses session.
 *
 * Total Hours Served = sum of hours from all Log Hours submissions by this person.
 * Total Seva Activities = number of times this person has submitted on the Log Hours page (count of submissions).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let email = searchParams.get("email")?.trim()?.toLowerCase();

    if (!email) {
      const session = getSessionFromCookie(req.headers.get("cookie"));
      if (session?.email) email = session.email.trim().toLowerCase();
    }

    if (!email) {
      return NextResponse.json({
        totalHoursServed: 0,
        totalSevaActivities: 0,
      });
    }

    let totalHoursServed = 0;
    let totalSevaActivities = 0;
    try {
      const [logHoursSum, logHoursCount] = await Promise.all([
        prisma.loggedHours.aggregate({
          where: { email },
          _sum: { hours: true },
        }),
        prisma.loggedHours.count({
          where: { email },
        }),
      ]);
      totalHoursServed = Math.round((logHoursSum._sum?.hours ?? 0) * 10) / 10;
      totalSevaActivities = logHoursCount;
    } catch (e) {
      console.error("Dashboard stats: LoggedHours query failed (table may be missing):", e);
      // Return zeros so dashboard doesn't 500; run prisma migrate deploy on production DB
    }

    return NextResponse.json({
      totalHoursServed,
      totalSevaActivities,
    });
  } catch (e: unknown) {
    console.error("Dashboard stats error:", e);
    return NextResponse.json(
      { error: "Failed to load stats", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
