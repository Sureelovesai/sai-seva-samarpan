import type { Prisma } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, activityCityWhere } from "@/lib/getRole";
import { activitySpansDateKey, dateKeyUTC } from "@/lib/sevaActivityDates";
import { isValidUsaRegion, prismaCityInUsaRegionOr } from "@/lib/usaRegions";

/**
 * Public listings (Find Seva, featured on Home, Join page): hide activities whose last day has passed.
 * Uses endDate if set, otherwise startDate (same-day activities use that day as the last day).
 * Undated activities (no start/end) stay listed. Does not delete data — analytics / dashboards still use historical signups & hours.
 */
function isStillOpenForPublicListing(a: { startDate: Date | null; endDate: Date | null }): boolean {
  const lastDay = a.endDate ?? a.startDate;
  if (!lastDay) return true;
  const lastKey = dateKeyUTC(lastDay);
  const todayKey = dateKeyUTC(new Date());
  return lastKey >= todayKey;
}

const STATUS_VALUES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

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
 * GET /api/seva-activities
 * Returns seva activities for Find Seva and public listings.
 * Optional query params:
 *   - category, city, q, featured (true)
 *   - usaRegion — Sri Sathya Sai USA region (Reg 1 … Reg 10); limits to cities in lib/data/sai-centers-city-usa-region.json
 *   - date=YYYY-MM-DD — only activities spanning that calendar day (includes past dates)
 *   - activityStatus — only for logged-in ADMIN / SEVA_COORDINATOR (ignored otherwise).
 *     DRAFT / ARCHIVED may include inactive activities; PUBLISHED keeps isActive true.
 *
 * Without `date`, past activities (last day before today) are omitted.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") || "All";
    const city = searchParams.get("city") || "All";
    const usaRegionRaw = (searchParams.get("usaRegion") || "").trim();
    const usaRegion =
      usaRegionRaw && usaRegionRaw !== "All" && isValidUsaRegion(usaRegionRaw) ? usaRegionRaw : null;
    const q = (searchParams.get("q") || "").trim();
    const featuredOnly = searchParams.get("featured") === "true";
    const dateDay = (searchParams.get("date") || "").trim();
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateDay);

    const activityStatusRaw = searchParams.get("activityStatus")?.trim() || "";
    const session = await getSessionWithRole(req.headers.get("cookie"));
    const canStatus =
      session && (session.role === "ADMIN" || session.role === "SEVA_COORDINATOR");
    const statusFilter =
      canStatus &&
      activityStatusRaw &&
      activityStatusRaw !== "All" &&
      (STATUS_VALUES as readonly string[]).includes(activityStatusRaw)
        ? activityStatusRaw
        : null;

    const base: Record<string, unknown> = {};
    if (statusFilter === "PUBLISHED") {
      base.isActive = true;
      base.status = "PUBLISHED";
    } else if (statusFilter) {
      base.status = statusFilter;
    } else {
      base.isActive = true;
    }

    if (featuredOnly) base.isFeatured = true;
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
          { locationName: { contains: q, mode: "insensitive" as const } },
          { address: { contains: q, mode: "insensitive" as const } },
        ],
      });
    }
    if (
      session?.role === "SEVA_COORDINATOR" &&
      session.coordinatorCities?.length &&
      statusFilter
    ) {
      andClauses.push(activityCityWhere(session.coordinatorCities));
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
    const detail = err?.error?.message ?? err?.message ?? (typeof e === "object" && e !== null ? String(e) : String(e));
    console.error("Seva GET error:", detail, e);
    return NextResponse.json(
      { error: "Failed to load activities", detail },
      { status: 500 }
    );
  }
}
