import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/community-outreach/partners
 * Public list of approved Community Outreach organizations (partner directory).
 */
export async function GET() {
  try {
    const rows = await prisma.communityOutreachProfile.findMany({
      where: { status: "APPROVED" },
      orderBy: { organizationName: "asc" },
      select: {
        id: true,
        organizationName: true,
        logoUrl: true,
        description: true,
        city: true,
        contactPhone: true,
        website: true,
        submittedAt: true,
        reviewedAt: true,
      },
    });

    return NextResponse.json(rows);
  } catch (e: unknown) {
    const err = e as Error & { message?: string };
    console.error("community-outreach partners GET:", err?.message ?? e);
    return NextResponse.json(
      { error: "Failed to load partner organizations" },
      { status: 500 }
    );
  }
}
