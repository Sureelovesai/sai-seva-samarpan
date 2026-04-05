import { hasRole, type SessionWithRole } from "@/lib/getRole";

/** Who may view and use the Seva Blog UI (stories, create post, generate report, etc.). */
export function canAccessSevaBlog(session: SessionWithRole | null): boolean {
  return hasRole(session, "ADMIN", "BLOG_ADMIN", "SEVA_COORDINATOR");
}

/** Upload into this post’s Drive folder: author, or admin / blog admin. */
export function canUploadToBlogPostDrive(
  session: SessionWithRole | null,
  post: { authorId: string | null }
): boolean {
  if (!session || !canAccessSevaBlog(session)) return false;
  if (hasRole(session, "ADMIN", "BLOG_ADMIN")) return true;
  if (post.authorId && session.sub === post.authorId) return true;
  return false;
}
