import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import { promotePendingSignupsForActivity } from "@/lib/sevaSignupPromotion";
import {
  communityActivityOwnedByProfile,
  getApprovedCommunityProfile,
  isCommunityOutreachSiteAdmin,
} from "@/lib/communityOutreachOwnership";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/community-outreach/signups/[id]
 * Remove a volunteer sign-up for an activity owned by this org (same promotion rules as admin).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(_req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getApprovedCommunityProfile(session.sub);
    const isAdmin = isCommunityOutreachSiteAdmin(session);
    if (!profile && !isAdmin) {
      return NextResponse.json(
        { error: "Your organization profile must be approved to manage sign-ups." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Signup ID required" }, { status: 400 });

    const signup = await prisma.sevaSignup.findUnique({
      where: { id },
      include: {
        activity: {
          select: {
            id: true,
            city: true,
            organizationName: true,
            listedAsCommunityOutreach: true,
          },
        },
      },
    });
    if (!signup) return NextResponse.json({ error: "Signup not found" }, { status: 404 });

    const allowed =
      isAdmin && signup.activity.listedAsCommunityOutreach
        ? true
        : profile
          ? communityActivityOwnedByProfile(profile, signup.activity)
          : false;
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activityId = signup.activityId;
    const freedApprovedSeat = signup.status === "APPROVED";

    await prisma.sevaSignup.delete({ where: { id } });

    if (freedApprovedSeat) {
      try {
        await promotePendingSignupsForActivity(activityId);
      } catch (promoErr) {
        console.error("community-outreach signups DELETE: promote pending failed", promoErr);
      }
    }

    return NextResponse.json({ ok: true, deleted: id });
  } catch (e: unknown) {
    console.error("community-outreach signups DELETE error:", e);
    return NextResponse.json(
      { error: "Failed to delete sign-up", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
