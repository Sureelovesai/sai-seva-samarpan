import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";

export const dynamic = "force-dynamic";

/**
 * GET /api/community-outreach/me
 * Current user + community outreach profile (if any).
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) {
      return NextResponse.json({ user: null, profile: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        communityOutreachProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null, profile: null });
    }

    const { communityOutreachProfile: profile, ...rest } = user;
    return NextResponse.json({
      user: rest,
      profile,
    });
  } catch (e: unknown) {
    console.error("GET /api/community-outreach/me:", e);
    return NextResponse.json(
      {
        user: null,
        profile: null,
        errorCode: "DATABASE_ERROR",
        message:
          "Could not load your account from the database. If you just deployed, run migrations and confirm DATABASE_URL.",
      },
      { status: 503 }
    );
  }
}
