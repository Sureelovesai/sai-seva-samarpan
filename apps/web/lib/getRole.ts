import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth";
import { parseCoordinatorRegionsList } from "@/lib/usaRegions";
import type { UsaRegionLabel } from "@/lib/usaRegions";

export type AppRole =
  | "ADMIN"
  | "BLOG_ADMIN"
  | "VOLUNTEER"
  | "SEVA_COORDINATOR"
  | "REGIONAL_SEVA_COORDINATOR"
  | "NATIONAL_SEVA_COORDINATOR"
  | "EVENT_ADMIN";

/** Primary role order (highest first). Used to pick a single "role" for backward compatibility. */
const ROLE_ORDER: AppRole[] = [
  "ADMIN",
  "BLOG_ADMIN",
  "NATIONAL_SEVA_COORDINATOR",
  "REGIONAL_SEVA_COORDINATOR",
  "SEVA_COORDINATOR",
  "EVENT_ADMIN",
  "VOLUNTEER",
];

export type SessionWithRole = {
  sub: string;
  email: string;
  /** All roles assigned to this user. */
  roles: AppRole[];
  /** Primary role (highest-precedence assigned role, or VOLUNTEER if none). */
  role: AppRole;
  coordinatorCities: string[] | null;
  /** Canonical USA region labels for REGIONAL_SEVA_COORDINATOR (e.g. Region 3). */
  coordinatorRegions: UsaRegionLabel[] | null;
};

/**
 * Get session from cookie and resolve roles from RoleAssignment.
 * A user can have multiple role assignments (e.g. BLOG_ADMIN + SEVA_COORDINATOR).
 * If no assignment exists, role is VOLUNTEER. Primary role is the highest in ROLE_ORDER.
 */
export async function getSessionWithRole(
  cookieHeader: string | null
): Promise<SessionWithRole | null> {
  const session = getSessionFromCookie(cookieHeader);
  if (!session) return null;

  let assignments: { role: string; cities: string | null; regions: string | null }[] = [];
  try {
    const rows = await prisma.roleAssignment.findMany({
      where: { email: { equals: session.email, mode: "insensitive" } },
    });
    assignments = rows;
  } catch (e) {
    console.error("getSessionWithRole: role lookup failed (table missing or DB error):", e);
  }

  const roles: AppRole[] =
    assignments.length > 0
      ? assignments.map((a) => a.role as AppRole)
      : ["VOLUNTEER"];

  const role: AppRole =
    ROLE_ORDER.find((r) => roles.includes(r)) ?? "VOLUNTEER";

  const coordinatorAssignment = assignments.find((a) => a.role === "SEVA_COORDINATOR" && a.cities);
  const coordinatorCities: string[] | null = coordinatorAssignment?.cities
    ? coordinatorAssignment.cities
        .split(",")
        .map((c: string) => c.trim())
        .filter(Boolean)
    : null;

  const regionalAssignment = assignments.find(
    (a) => a.role === "REGIONAL_SEVA_COORDINATOR" && a.regions
  );
  const coordinatorRegions: UsaRegionLabel[] | null = regionalAssignment?.regions
    ? parseCoordinatorRegionsList(regionalAssignment.regions)
    : null;

  return {
    sub: session.sub,
    email: session.email,
    roles,
    role,
    coordinatorCities,
    coordinatorRegions,
  };
}

/** True if the session has at least one of the given roles. */
export function hasRole(session: SessionWithRole | null, ...allowed: AppRole[]): boolean {
  if (!session) return false;
  return allowed.some((r) => session.roles.includes(r));
}

/** Seva / blog / full admin surfaces (not event-only). */
export function canAccessSevaAdminSurfaces(session: SessionWithRole | null): boolean {
  return hasRole(
    session,
    "ADMIN",
    "BLOG_ADMIN",
    "SEVA_COORDINATOR",
    "REGIONAL_SEVA_COORDINATOR",
    "NATIONAL_SEVA_COORDINATOR"
  );
}

/** Portal events APIs and event admin pages. */
export function canManagePortalEvents(session: SessionWithRole | null): boolean {
  return hasRole(
    session,
    "ADMIN",
    "BLOG_ADMIN",
    "SEVA_COORDINATOR",
    "REGIONAL_SEVA_COORDINATOR",
    "NATIONAL_SEVA_COORDINATOR",
    "EVENT_ADMIN"
  );
}

/**
 * User has EVENT_ADMIN and no ADMIN / BLOG_ADMIN / seva coordinator roles — restrict UI to event admin only.
 */
export function isEventAdminOnlyUser(session: SessionWithRole | null): boolean {
  if (!session) return false;
  if (canAccessSevaAdminSurfaces(session)) return false;
  return session.roles.includes("EVENT_ADMIN");
}

/** Build Prisma where clause for SevaActivity by coordinator cities (case-insensitive). */
export function activityCityWhere(cities: string[]) {
  if (cities.length === 0) return { id: "impossible" };
  return {
    OR: cities.map((c: string) => ({ city: { equals: c, mode: "insensitive" as const } })),
  };
}
