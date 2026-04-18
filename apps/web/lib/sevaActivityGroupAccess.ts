import type { Prisma, SevaActivityScope } from "@/generated/prisma";
import { activityCityWhere, hasRole, type SessionWithRole } from "@/lib/getRole";

export type SevaActivityGroupAccessRow = {
  scope: SevaActivityScope;
  city: string;
  sevaUsaRegion: string | null;
};

/**
 * Where clause for admin list of seva activity groups (same geography rules as activities).
 */
export function adminSevaActivityGroupListWhere(
  session: SessionWithRole
): Prisma.SevaActivityGroupWhereInput | null {
  if (hasRole(session, "ADMIN", "BLOG_ADMIN", "EVENT_ADMIN")) return null;

  const parts: Prisma.SevaActivityGroupWhereInput[] = [];

  if (hasRole(session, "SEVA_COORDINATOR") && session.coordinatorCities?.length) {
    parts.push({
      AND: [{ scope: "CENTER" }, activityCityWhere(session.coordinatorCities)],
    });
  }

  if (hasRole(session, "REGIONAL_SEVA_COORDINATOR") && session.coordinatorRegions?.length) {
    parts.push({
      scope: "REGIONAL",
      sevaUsaRegion: { in: session.coordinatorRegions },
    });
  }

  if (hasRole(session, "NATIONAL_SEVA_COORDINATOR")) {
    parts.push({ scope: "NATIONAL" });
  }

  if (parts.length === 0) {
    return { id: { in: [] } };
  }
  if (parts.length === 1) return parts[0]!;
  return { OR: parts };
}

export function sessionCanAccessAdminSevaActivityGroup(
  session: SessionWithRole,
  group: SevaActivityGroupAccessRow
): boolean {
  if (hasRole(session, "ADMIN", "BLOG_ADMIN", "EVENT_ADMIN")) return true;

  const scope = group.scope;
  const city = (group.city ?? "").trim();
  const region = group.sevaUsaRegion?.trim() ?? "";

  if (scope === "CENTER" && hasRole(session, "SEVA_COORDINATOR") && session.coordinatorCities?.length) {
    return session.coordinatorCities.some((c) => c.trim().toLowerCase() === city.toLowerCase());
  }

  if (
    scope === "REGIONAL" &&
    hasRole(session, "REGIONAL_SEVA_COORDINATOR") &&
    session.coordinatorRegions?.length &&
    region
  ) {
    return session.coordinatorRegions.some((r) => r === region);
  }

  if (scope === "NATIONAL" && hasRole(session, "NATIONAL_SEVA_COORDINATOR")) {
    return true;
  }

  return false;
}
