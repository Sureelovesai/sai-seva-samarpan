import type { Prisma } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activitySpansDateKey, dateKeyUTC } from "@/lib/sevaActivityDates";
import { parseUsaRegionParam, prismaCityInUsaRegionOr } from "@/lib/usaRegions";

/** Same date-window rule as Find Seva public listings. */
function isStillOpenForPublicListing(a: { startDate: Date | null; endDate: Date | null }): boolean {
  const lastDay = a.endDate ?? a.startDate;
  if (!lastDay) return true;
  const lastKey = dateKeyUTC(lastDay);
  const todayKey = dateKeyUTC(new Date());
  return lastKey >= todayKey;
}

const activityPublicSelect = {
  id: true,
  title: true,
  category: true,
  description: true,
  city: true,
  startDate: true,
  endDate: true,
  startTime: true,
  endTime: true,
  durationHours: true,
  locationName: true,
  organizationName: true,
  address: true,
  capacity: true,
  coordinatorName: true,
  coordinatorEmail: true,
  coordinatorPhone: true,
  imageUrl: true,
  isActive: true,
  isFeatured: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SevaActivitySelect;

type ActivityPublicRow = Prisma.SevaActivityGetPayload<{ select: typeof activityPublicSelect }>;

/**
 * GET /api/community-activities
 * Public listings for Community Outreach–posted activities only (not Find Seva).
 * Query: category, city, usaRegion, date, q (search title, description, city, org name, location, address).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") || "All";
    const city = searchParams.get("city") || "All";
    const usaRegionRaw = (searchParams.get("usaRegion") || "").trim();
    const usaRegion =
      usaRegionRaw && usaRegionRaw !== "All" ? parseUsaRegionParam(usaRegionRaw) : null;
    const q = (searchParams.get("q") || "").trim();
    const dateDay = (searchParams.get("date") || "").trim();
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateDay);

    const base: Record<string, unknown> = {
      listedAsCommunityOutreach: true,
      isActive: true,
      status: "PUBLISHED",
    };

    if (category !== "All") base.category = category;
    if (city !== "All") base.city = city;

    const andClauses: object[] = [];
    if (usaRegion) {
      andClauses.push(prismaCityInUsaRegionOr(usaRegion));
    }
    if (q) {
      andClauses.push({
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
          { city: { contains: q, mode: "insensitive" as const } },
          { organizationName: { contains: q, mode: "insensitive" as const } },
          { locationName: { contains: q, mode: "insensitive" as const } },
          { address: { contains: q, mode: "insensitive" as const } },
        ],
      });
    }

    const where =
      andClauses.length > 0 ? { ...base, AND: andClauses } : base;

    const activities: ActivityPublicRow[] = await prisma.sevaActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: activityPublicSelect,
    });

    let list: ActivityPublicRow[];
    if (dateOk) {
      list = activities.filter((a: ActivityPublicRow) => activitySpansDateKey(a, dateDay));
    } else {
      list = activities.filter(isStillOpenForPublicListing);
    }

    return NextResponse.json(list);
  } catch (e: unknown) {
    const err = e as Error & { error?: Error; message?: string };
    const detail = err?.error?.message ?? err?.message ?? String(e);
    console.error("community-activities GET error:", detail, e);
    return NextResponse.json(
      { error: "Failed to load community activities", detail },
      { status: 500 }
    );
  }
}
