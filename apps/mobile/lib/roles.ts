import type { AppRole, CurrentUser, SevaScope } from "@/lib/types";

const BLOG_ROLES: AppRole[] = [
  "ADMIN",
  "BLOG_ADMIN",
  "SEVA_COORDINATOR",
  "REGIONAL_SEVA_COORDINATOR",
  "NATIONAL_SEVA_COORDINATOR",
];

const SEVA_ADMIN_ROLES: AppRole[] = [
  "ADMIN",
  "BLOG_ADMIN",
  "SEVA_COORDINATOR",
  "REGIONAL_SEVA_COORDINATOR",
  "NATIONAL_SEVA_COORDINATOR",
];

function rolesOf(user: CurrentUser | null): AppRole[] {
  if (!user) return [];
  return user.roles?.length ? user.roles : [user.role];
}

function has(user: CurrentUser | null, ...allowed: AppRole[]): boolean {
  const roles = rolesOf(user);
  return roles.some((r) => allowed.includes(r));
}

/** Mirrors web canAccessSevaBlog: who may list/create community blog posts. */
export function canAccessBlog(user: CurrentUser | null): boolean {
  return has(user, ...BLOG_ROLES);
}

/** Who may see the Seva Admin Dashboard + admin surfaces. */
export function canAccessSevaAdmin(user: CurrentUser | null): boolean {
  return has(user, ...SEVA_ADMIN_ROLES);
}

/** Roles that can create/edit activities (BLOG_ADMIN cannot edit single activities). */
export function canManageActivities(user: CurrentUser | null): boolean {
  return has(
    user,
    "ADMIN",
    "SEVA_COORDINATOR",
    "REGIONAL_SEVA_COORDINATOR",
    "NATIONAL_SEVA_COORDINATOR"
  );
}

/** Only the primary ADMIN role can manage role assignments. */
export function isAdmin(user: CurrentUser | null): boolean {
  return user?.role === "ADMIN";
}

/** Who may review community partner profiles (ADMIN or any Seva Coordinator). */
export function canReviewCommunity(user: CurrentUser | null): boolean {
  return has(user, "ADMIN", "SEVA_COORDINATOR");
}

/** Mirrors web canManagePortalEvents: who may create/manage portal events. */
export function canManageEvents(user: CurrentUser | null): boolean {
  return has(
    user,
    "ADMIN",
    "BLOG_ADMIN",
    "SEVA_COORDINATOR",
    "REGIONAL_SEVA_COORDINATOR",
    "NATIONAL_SEVA_COORDINATOR",
    "EVENT_ADMIN"
  );
}

/** Scope options the user is allowed to create/edit in, mirroring the web Add Seva form. */
export function allowedScopes(user: CurrentUser | null): SevaScope[] {
  const roles = rolesOf(user);
  if (roles.includes("ADMIN")) return ["CENTER", "REGIONAL", "NATIONAL"];
  const scopes: SevaScope[] = [];
  if (roles.includes("SEVA_COORDINATOR")) scopes.push("CENTER");
  if (roles.includes("REGIONAL_SEVA_COORDINATOR")) scopes.push("REGIONAL");
  if (roles.includes("NATIONAL_SEVA_COORDINATOR")) scopes.push("NATIONAL");
  return scopes.length ? scopes : ["CENTER"];
}
