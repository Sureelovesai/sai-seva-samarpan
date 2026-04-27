import { hasRole, type SessionWithRole } from "@/lib/getRole";

/** Who may view and use the Seva Blog UI (stories, create post, generate report, etc.). */
export function canAccessSevaBlog(session: SessionWithRole | null): boolean {
  return hasRole(
    session,
    "ADMIN",
    "BLOG_ADMIN",
    "SEVA_COORDINATOR",
    "REGIONAL_SEVA_COORDINATOR",
    "NATIONAL_SEVA_COORDINATOR"
  );
}
