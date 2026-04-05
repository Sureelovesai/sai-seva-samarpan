import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activitySpansDateKey, eachDateKeyInMonth } from "@/lib/sevaActivityDates";
import { parseUsaRegionParam, prismaCityInUsaRegionOr } from "@/lib/usaRegions";

/**
 * GET /api/seva-calendar
 * Public: activity counts per calendar day (published, active listings only).
 * Same filters as Find Seva for center/region; no auth required.
 * Query: year, month (1–12), center (optional, "All" or city name), usaRegion (optional).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    const center = searchParams.get("center")?.trim() || "All";
    const usaRegionRaw = (searchParams.get("usaRegion") || "").trim();
    const usaRegion =
      usaRegionRaw && usaRegionRaw !== "All" ? parseUsaRegionParam(usaRegionRaw) : null;

    if (!Number.isFinite(year) || year < 1970 || year > 2100) {
      return NextResponse.json({ error: "Valid year required" }, { status: 400 });
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Valid month required (1–12)" }, { status: 400 });
    }

    const baseWhere: Record<string, unknown> = {
      isActive: true,
      status: "PUBLISHED",
      listedAsCommunityOutreach: false,
    };
    if (center !== "All") baseWhere.city = center;

    const andParts: object[] = [];
    if (usaRegion) {
      andParts.push(prismaCityInUsaRegionOr(usaRegion));
    }

    let activityWhere: Record<string, unknown> = baseWhere;
    if (andParts.length > 0) {
      activityWhere = { AND: [baseWhere, ...andParts] };
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
    console.error("Public seva-calendar GET error:", e);
    return NextResponse.json(
      { error: "Failed to load calendar", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
