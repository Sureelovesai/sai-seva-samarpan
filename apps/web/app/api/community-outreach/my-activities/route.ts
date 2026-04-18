import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import {
  getApprovedCommunityProfile,
  isCommunityOutreachSiteAdmin,
  myPostedCommunityActivitiesWhere,
  postedBySessionWhere,
} from "@/lib/communityOutreachOwnership";

export const dynamic = "force-dynamic";

/**
 * GET /api/community-outreach/my-activities
 * Lists Community Outreach activities posted by the signed-in user only. Approved org members are scoped to their org/city; site admins without a profile still see only their own postings here.
 */
export async function GET(request: Request) {
  try {
    const session = await getSessionWithRole(request.headers.get("cookie"));
    if (!session) {
      return NextResponse.json({ error: "Sign in to manage activities." }, { status: 401 });
    }

    const profile = await getApprovedCommunityProfile(session.sub);
    const isAdmin = isCommunityOutreachSiteAdmin(session);
    if (!profile && !isAdmin) {
      return NextResponse.json(
        { error: "Your organization profile must be approved to manage activities." },
        { status: 403 }
      );
    }

    const activities = await prisma.sevaActivity.findMany({
      where:
        profile != null
          ? myPostedCommunityActivitiesWhere(profile, session)
          : postedBySessionWhere(session),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        city: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        isActive: true,
        status: true,
        capacity: true,
        organizationName: true,
        createdAt: true,
        _count: { select: { signups: true } },
      },
    });

    return NextResponse.json(activities);
  } catch (e: unknown) {
    console.error("community-outreach my-activities GET:", e);
    return NextResponse.json(
      { error: "Failed to load activities", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
