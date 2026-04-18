import type { Prisma, SevaActivityScope } from "@/generated/prisma";
import { activityCityWhere, hasRole, type SessionWithRole } from "@/lib/getRole";
import { isValidUsaRegion } from "@/lib/usaRegions";

export type SevaActivityAccessRow = {
  scope: SevaActivityScope;
  city: string;
  sevaUsaRegion: string | null;
};

/**
 * Where clause for admin list APIs: coordinators only see activities in their scope.
 * ADMIN / BLOG_ADMIN / EVENT_ADMIN: no extra filter (null).
 */
export function adminSevaActivityListWhere(
  session: SessionWithRole
): Prisma.SevaActivityWhereInput | null {
  if (hasRole(session, "ADMIN", "BLOG_ADMIN", "EVENT_ADMIN")) return null;

  const parts: Prisma.SevaActivityWhereInput[] = [];

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

export function sessionCanAccessAdminSevaActivity(
  session: SessionWithRole,
  activity: SevaActivityAccessRow
): boolean {
  if (hasRole(session, "ADMIN", "BLOG_ADMIN", "EVENT_ADMIN")) return true;

  const scope = activity.scope;
  const city = (activity.city ?? "").trim();
  const region = activity.sevaUsaRegion?.trim() ?? "";

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

function normalizeScope(raw: unknown): SevaActivityScope {
  if (raw === "REGIONAL" || raw === "NATIONAL" || raw === "CENTER") return raw;
  return "CENTER";
}

/**
 * Validates create/update payload for non–full-admin users. Admins/blog admins pass through (caller still validates required fields).
 */
export function validateSevaScopeForSession(
  session: SessionWithRole,
  input: { scope: SevaActivityScope; city: string; sevaUsaRegion: string | null }
): { ok: true } | { ok: false; error: string; status: number } {
  const scope = input.scope;
  const city = input.city?.trim() ?? "";
  const sevaUsaRegion = input.sevaUsaRegion?.trim() ?? "";

  if (hasRole(session, "ADMIN", "BLOG_ADMIN")) {
    if (scope === "REGIONAL") {
      if (!sevaUsaRegion || !isValidUsaRegion(sevaUsaRegion)) {
        return { ok: false, error: "A valid USA region is required for regional activities", status: 400 };
      }
    }
    if (scope === "NATIONAL" && !city) {
      return { ok: false, error: "City/label is required", status: 400 };
    }
    if (scope === "CENTER" && !city) {
      return { ok: false, error: "City is required", status: 400 };
    }
    return { ok: true };
  }

  if (scope === "CENTER") {
    if (!hasRole(session, "SEVA_COORDINATOR")) {
      return { ok: false, error: "Only Seva Coordinators can create center-level activities", status: 403 };
    }
    if (!session.coordinatorCities?.length) {
      return { ok: false, error: "Your coordinator account has no registered cities", status: 403 };
    }
    if (!city) {
      return { ok: false, error: "City is required", status: 400 };
    }
    const allowed = session.coordinatorCities.some((c) => c.trim().toLowerCase() === city.toLowerCase());
    if (!allowed) {
      return { ok: false, error: "You can only add activities for your registered location(s)", status: 403 };
    }
    return { ok: true };
  }

  if (scope === "REGIONAL") {
    if (!hasRole(session, "REGIONAL_SEVA_COORDINATOR")) {
      return { ok: false, error: "Only Regional Seva Coordinators can create regional activities", status: 403 };
    }
    if (!session.coordinatorRegions?.length) {
      return { ok: false, error: "Your account has no assigned USA regions", status: 403 };
    }
    if (!sevaUsaRegion || !isValidUsaRegion(sevaUsaRegion)) {
      return { ok: false, error: "A valid USA region is required for regional activities", status: 400 };
    }
    const allowed = (session.coordinatorRegions as readonly string[]).includes(sevaUsaRegion);
    if (!allowed) {
      return { ok: false, error: "You can only add activities for your assigned region(s)", status: 403 };
    }
    if (!city) {
      return { ok: false, error: "City or location label is required", status: 400 };
    }
    return { ok: true };
  }

  if (scope === "NATIONAL") {
    if (!hasRole(session, "NATIONAL_SEVA_COORDINATOR")) {
      return { ok: false, error: "Only National Seva Coordinators can create national activities", status: 403 };
    }
    if (!city) {
      return { ok: false, error: "City or location label is required", status: 400 };
    }
    return { ok: true };
  }

  return { ok: true };
}

export function parseScopeFromBody(body: { scope?: unknown }): SevaActivityScope {
  return normalizeScope(body?.scope);
}
