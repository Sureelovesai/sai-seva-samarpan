import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, activityCityWhere } from "@/lib/getRole";

/**
 * GET /api/admin/seva-signups
 * List sign-ups with optional filters.
 * Query: activityId, status (PENDING|APPROVED|REJECTED|CANCELLED), fromDate (yyyy-mm-dd), toDate (yyyy-mm-dd)
 * Requires Admin or Seva Coordinator. For Seva Coordinator, only signups for activities in their cities.
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get("activityId") || undefined;
    const status = searchParams.get("status") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    const where: any = {};

    if (session.role === "SEVA_COORDINATOR" && session.coordinatorCities?.length) {
      where.activity = activityCityWhere(session.coordinatorCities);
    }
    if (activityId) where.activityId = activityId;
    if (status && ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
      where.status = status;
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate + "T00:00:00.000Z");
      if (toDate) where.createdAt.lte = new Date(toDate + "T23:59:59.999Z");
    }

    const signups = await prisma.sevaSignup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        activity: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(signups);
  } catch (e: any) {
    console.error("Admin seva-signups GET error:", e);
    return NextResponse.json(
      { error: "Failed to load sign-ups", detail: e?.message },
      { status: 500 }
    );
  }
}
