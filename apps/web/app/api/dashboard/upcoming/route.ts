import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth";
import { isActivityEnded } from "@/lib/activityEnded";

/**
 * GET /api/dashboard/upcoming
 * My Seva Dashboard is personal — no location or role restrictions.
 * Returns upcoming Seva activities that this person has JOINED (signed up for).
 * When joining an activity, everyone is a volunteer (including Admin and Seva Coordinator).
 * Logic: match SevaSignup.email (email used when joining) to signed-in email; if both match
 * and the activity has not ended yet (uses endDate, duration, times — not startDate alone),
 * the activity appears in Upcoming. Multi-day ranges (e.g. Apr 7–19) stay listed until the last day.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let signedInEmail = searchParams.get("email")?.trim()?.toLowerCase();

    if (!signedInEmail) {
      const session = getSessionFromCookie(req.headers.get("cookie"));
      if (session?.email) signedInEmail = session.email.trim().toLowerCase();
    }

    if (!signedInEmail) {
      return NextResponse.json([]);
    }

    // Only activities where the user joined with the same email they're signed in with (exclude withdrawn)
    const signups = await prisma.sevaSignup.findMany({
      where: {
        email: { equals: signedInEmail, mode: "insensitive" },
        status: { in: ["PENDING", "APPROVED"] },
      },
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            startTime: true,
            endTime: true,
            durationHours: true,
            city: true,
          },
        },
      },
    });

    const upcoming = signups
      .filter((s: (typeof signups)[number]) => {
        const a = s.activity;
        if (!a) return false;
        return !isActivityEnded({
          startDate: a.startDate,
          endDate: a.endDate,
          startTime: a.startTime,
          endTime: a.endTime,
          durationHours: a.durationHours,
        });
      })
      .map((s: (typeof signups)[number]) => ({
        id: s.activity!.id,
        signupId: s.id,
        title: s.activity!.title,
        startDate: s.activity!.startDate,
        city: s.activity!.city,
      }))
      .sort((a: { startDate: Date | null }, b: { startDate: Date | null }) => {
        // Activities with a date first (ascending), then activities with no date (nulls last)
        const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .slice(0, 8);

    return NextResponse.json(upcoming);
  } catch (e: unknown) {
    console.error("Dashboard upcoming error:", e);
    return NextResponse.json(
      { error: "Failed to load upcoming", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
