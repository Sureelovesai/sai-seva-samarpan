import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, isEventAdminOnlyUser } from "@/lib/getRole";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? null;
    const sessionWithRole = await getSessionWithRole(cookieHeader);
    if (!sessionWithRole) {
      console.warn("Me endpoint: No session found");
      return NextResponse.json({ user: null });
    }

    console.log("Me endpoint: Session found for", sessionWithRole.email, "with roles:", sessionWithRole.roles);

    const user = await prisma.user.findUnique({
      where: { id: sessionWithRole.sub },
      select: { id: true, email: true, firstName: true, lastName: true, name: true, location: true },
    });
    if (!user) {
      console.warn("Me endpoint: User not found in database for sub:", sessionWithRole.sub);
      return NextResponse.json({ user: null });
    }

    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        location: user.location,
        role: sessionWithRole.role,
        roles: sessionWithRole.roles,
        coordinatorCities: sessionWithRole.coordinatorCities,
        coordinatorRegions: sessionWithRole.coordinatorRegions,
        eventAdminOnly: isEventAdminOnlyUser(sessionWithRole),
      },
    };
    
    console.log("Me endpoint: Returning user data:", {
      email: user.email,
      role: sessionWithRole.role,
      roles: sessionWithRole.roles,
      eventAdminOnly: isEventAdminOnlyUser(sessionWithRole),
    });

    return NextResponse.json(responseData);
  } catch (e: unknown) {
    console.error("Me error:", {
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
