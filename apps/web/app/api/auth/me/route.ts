import { NextResponse } from "next/server";
import { getSessionWithRole } from "@/lib/getRole";

/**
 * GET /api/auth/me
 * Returns the current logged-in user's info from the session cookie
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        sub: session.sub,
        email: session.email,
        roles: session.roles,
        role: session.role,
      },
    });
  } catch (e: unknown) {
    console.error("GET /api/auth/me error:", e);
    return NextResponse.json(
      { user: null, error: (e as Error)?.message },
      { status: 200 }
    );
  }
}
