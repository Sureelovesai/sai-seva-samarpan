import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** YYYY-MM-DD from a Date (UTC calendar day, matches typical stored activity dates). */
function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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

/**
 * GET /api/seva-activities
 * Returns active seva activities
 * Optional query params:
 *   - category
 *   - city
 *   - q (search text)
 *   - featured (true = only activities with isFeatured true)
 *
 * Past activities (last calendar day before today) are omitted from this response only;
 * they remain in the database for analytics, admin, and impact stats.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") || "All";
    const city = searchParams.get("city") || "All";
    const q = (searchParams.get("q") || "").trim();
    const featuredOnly = searchParams.get("featured") === "true";

    const where: any = {
      isActive: true,
    };

    if (featuredOnly) {
      where.isFeatured = true;
    }

    if (category !== "All") {
      where.category = category;
    }

    if (city !== "All") {
      where.city = city;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { locationName: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ];
    }

    const activities = await prisma.sevaActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
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
      },
    });

    const openForListing = activities.filter(isStillOpenForPublicListing);

    return NextResponse.json(openForListing);
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
