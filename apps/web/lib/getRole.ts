import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth";

export type AppRole = "ADMIN" | "VOLUNTEER" | "SEVA_COORDINATOR";

export type SessionWithRole = {
  sub: string;
  email: string;
  role: AppRole;
  coordinatorCities: string[] | null;
};

/**
 * Get session from cookie and resolve role from RoleAssignment.
 * If no assignment exists for the user's email, role is VOLUNTEER.
 * If RoleAssignment table is missing or DB errors, we still return session as VOLUNTEER (avoids 500).
 */
export async function getSessionWithRole(
  cookieHeader: string | null
): Promise<SessionWithRole | null> {
  const session = getSessionFromCookie(cookieHeader);
  if (!session) return null;

  let assignment: { role: string; cities: string | null } | null = null;
  try {
    assignment = await prisma.roleAssignment.findFirst({
      where: { email: { equals: session.email, mode: "insensitive" } },
    });
  } catch (e) {
    console.error("getSessionWithRole: role lookup failed (table missing or DB error):", e);
    // Fall back to VOLUNTEER so /api/auth/me and other routes don't 500
  }

  const role: AppRole = assignment
    ? (assignment.role as AppRole)
    : "VOLUNTEER";

  const coordinatorCities: string[] | null =
    role === "SEVA_COORDINATOR" && assignment?.cities
      ? assignment.cities
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean)
      : null;

  return {
    sub: session.sub,
    email: session.email,
    role,
    coordinatorCities,
  };
}

/** Build Prisma where clause for SevaActivity by coordinator cities (case-insensitive). */
export function activityCityWhere(cities: string[]) {
  if (cities.length === 0) return { id: "impossible" };
  return {
    OR: cities.map((c: string) => ({ city: { equals: c, mode: "insensitive" as const } })),
  };
}
