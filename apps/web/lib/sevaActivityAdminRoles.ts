/** Client-safe list — roles that may use Seva Admin (dashboard, add/manage seva). */
export const SEVA_ACTIVITY_ADMIN_ROLES = [
  "ADMIN",
  "BLOG_ADMIN",
  "SEVA_COORDINATOR",
  "REGIONAL_SEVA_COORDINATOR",
  "NATIONAL_SEVA_COORDINATOR",
] as const;

export function hasSevaActivityAdminRole(roles: string[] | null | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((r) =>
    (SEVA_ACTIVITY_ADMIN_ROLES as readonly string[]).includes(r)
  );
}

/** Add/Manage Seva tiles (not Blog Admin). */
export const SEVA_ACTIVITY_TILE_ROLES = [
  "ADMIN",
  "SEVA_COORDINATOR",
  "REGIONAL_SEVA_COORDINATOR",
  "NATIONAL_SEVA_COORDINATOR",
] as const;

export function canSeeSevaActivityTiles(roles: string[] | null | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => (SEVA_ACTIVITY_TILE_ROLES as readonly string[]).includes(r));
}
