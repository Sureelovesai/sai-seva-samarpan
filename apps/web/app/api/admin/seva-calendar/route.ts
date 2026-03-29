import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, activityCityWhere } from "@/lib/getRole";
import { activitySpansDateKey, eachDateKeyInMonth } from "@/lib/sevaActivityDates";
import { isValidUsaRegion, prismaCityInUsaRegionOr } from "@/lib/usaRegions";

/**
 * GET /api/admin/seva-calendar
 * Activity counts per calendar day for a month (admin / seva coordinator).
 * Query: year (number), month (1–12), center (optional), usaRegion (optional), status (optional: All | DRAFT | PUBLISHED | ARCHIVED).
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER" || session.role === "BLOG_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    const center = searchParams.get("center")?.trim() || "All";
    const usaRegionRaw = (searchParams.get("usaRegion") || "").trim();
    const usaRegion =
      usaRegionRaw && usaRegionRaw !== "All" && isValidUsaRegion(usaRegionRaw) ? usaRegionRaw : null;
    const status = searchParams.get("status")?.trim() || "All";

    if (!Number.isFinite(year) || year < 1970 || year > 2100) {
      return NextResponse.json({ error: "Valid year required" }, { status: 400 });
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Valid month required (1–12)" }, { status: 400 });
    }

    const baseWhere: Record<string, unknown> = {};
    if (center !== "All") baseWhere.city = center;
    if (status !== "All" && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
      baseWhere.status = status;
    }

    const andParts: object[] = [];
    if (usaRegion) {
      andParts.push(prismaCityInUsaRegionOr(usaRegion));
    }

    const cityFilter =
      session.role === "SEVA_COORDINATOR" && session.coordinatorCities?.length
        ? activityCityWhere(session.coordinatorCities)
        : undefined;

    let activityWhere: Record<string, unknown> = baseWhere;
    if (cityFilter) {
      activityWhere =
        Object.keys(baseWhere).length > 0 ? { AND: [baseWhere, cityFilter] } : cityFilter;
    }
    if (andParts.length > 0) {
      activityWhere =
        Object.keys(activityWhere).length > 0
          ? { AND: [activityWhere, ...andParts] }
          : { AND: andParts };
    }

    const activities = await prisma.sevaActivity.findMany({
      where: activityWhere,
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
    });

    const dayKeys = eachDateKeyInMonth(year, month);
    const counts: Record<string, number> = {};
    for (const d of dayKeys) counts[d] = 0;

    for (const a of activities) {
      for (const d of dayKeys) {
        if (activitySpansDateKey(a, d)) counts[d] += 1;
      }
    }

    return NextResponse.json({ year, month, counts });
  } catch (e: unknown) {
    console.error("Admin seva-calendar GET error:", e);
    return NextResponse.json(
      { error: "Failed to load calendar", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
