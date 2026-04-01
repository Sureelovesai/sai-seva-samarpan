import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole } from "@/lib/getRole";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/community-outreach/profiles?status=PENDING
 * ADMIN: all. SEVA_COORDINATOR: pending profiles in their cities only.
 */
export async function GET(req: Request) {
  const session = await getSessionWithRole(req.headers.get("cookie"));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(session, "ADMIN", "SEVA_COORDINATOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusRaw = (searchParams.get("status") || "PENDING").toUpperCase();
  const status =
    statusRaw === "APPROVED" || statusRaw === "REJECTED" || statusRaw === "PENDING"
      ? statusRaw
      : "PENDING";

  const where: {
    status: typeof status;
    OR?: { city: { equals: string; mode: "insensitive" } }[];
  } = { status };

  if (
    !hasRole(session, "ADMIN") &&
    hasRole(session, "SEVA_COORDINATOR") &&
    session.coordinatorCities?.length
  ) {
    const cities = session.coordinatorCities.map((c) => c.trim()).filter(Boolean);
    if (cities.length === 0) {
      return NextResponse.json([]);
    }
    where.OR = cities.map((c) => ({ city: { equals: c, mode: "insensitive" as const } }));
  }

  const rows = await prisma.communityOutreachProfile.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    include: {
      user: {
        select: { email: true, firstName: true, lastName: true, name: true },
      },
    },
  });

  return NextResponse.json(rows);
}
