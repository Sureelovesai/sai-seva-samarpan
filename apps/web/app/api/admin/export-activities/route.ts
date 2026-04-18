import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import { adminSevaActivityListWhere } from "@/lib/sevaCoordinatorActivityAccess";

/**
 * GET /api/admin/export-activities
 * Returns all Seva activities matching the same filters as Analytics (center, category, from, to, search).
 * For Seva Coordinator, restricted to their cities. Used for Export CSV on Seva Admin Dashboard.
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const center = searchParams.get("center")?.trim() || undefined;
    const category = searchParams.get("category")?.trim() || undefined;
    const from = searchParams.get("from")?.trim() || undefined;
    const to = searchParams.get("to")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;

    const baseWhere: Record<string, unknown> = {};
    if (center && center !== "All") baseWhere.city = center;
    if (category && category !== "All") baseWhere.category = category;
    if (from || to) {
      baseWhere.startDate = {};
      if (from) (baseWhere.startDate as Record<string, unknown>).gte = new Date(from + "T00:00:00");
      if (to) (baseWhere.startDate as Record<string, unknown>).lte = new Date(to + "T23:59:59");
    }
    if (search) {
      const searchOr = {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      };
      baseWhere.AND = Array.isArray(baseWhere.AND) ? [...baseWhere.AND, searchOr] : [searchOr];
    }

    const scopeFilter = adminSevaActivityListWhere(session);
    const activityWhere =
      scopeFilter && Object.keys(baseWhere).length > 0
        ? { AND: [baseWhere, scopeFilter] }
        : scopeFilter
          ? scopeFilter
          : baseWhere;

    const activities = await prisma.sevaActivity.findMany({
      where: activityWhere,
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        city: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        status: true,
        isActive: true,
        capacity: true,
        _count: { select: { signups: true } },
      },
    });

    return NextResponse.json(
      activities.map((a: (typeof activities)[number]) => ({
        id: a.id,
        sevaActivity: a.title ?? "",
        title: a.title,
        category: a.category,
        city: a.city,
        startDate: a.startDate,
        endDate: a.endDate,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        isActive: a.isActive,
        capacity: a.capacity,
        signupCount: a._count.signups,
      }))
    );
  } catch (e: unknown) {
    console.error("Export activities error:", e);
    return NextResponse.json(
      { error: "Failed to export activities", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
