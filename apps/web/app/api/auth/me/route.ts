import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, isEventAdminOnlyUser } from "@/lib/getRole";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? null;
    const sessionWithRole = await getSessionWithRole(cookieHeader);
    if (!sessionWithRole) return NextResponse.json({ user: null });

    const user = await prisma.user.findUnique({
      where: { id: sessionWithRole.sub },
      select: { id: true, email: true, firstName: true, lastName: true, name: true, location: true },
    });
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({
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
        eventAdminOnly: isEventAdminOnlyUser(sessionWithRole),
      },
    });
  } catch (e: unknown) {
    console.error("Me error:", e);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
