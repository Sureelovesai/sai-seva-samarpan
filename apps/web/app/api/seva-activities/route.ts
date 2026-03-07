import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/seva-activities
 * Returns active seva activities
 * Optional query params:
 *   - category
 *   - city
 *   - q (search text)
 *   - featured (true = only activities with isFeatured true)
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

    return NextResponse.json(activities);
  } catch (error: any) {
    console.error("Seva GET error:", error);

    return NextResponse.json(
      {
        error: "Failed to load activities",
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
