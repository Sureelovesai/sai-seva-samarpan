import { prisma } from "@/lib/prisma";
import { hasRole, type SessionWithRole } from "@/lib/getRole";

function asPostIdArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

export function canGenerateBlogReport(session: SessionWithRole | null): boolean {
  return hasRole(session, "ADMIN", "BLOG_ADMIN", "SEVA_COORDINATOR");
}

/** Admins, blog admins, seva coordinators, creator, or any author of a source post. */
export async function canViewBlogReport(
  session: SessionWithRole | null,
  report: { createdById: string | null; sourcePostIds: unknown }
): Promise<boolean> {
  if (!session) return false;
  if (hasRole(session, "ADMIN", "BLOG_ADMIN", "SEVA_COORDINATOR")) return true;
  if (report.createdById === session.sub) return true;
  const ids = asPostIdArray(report.sourcePostIds);
  if (ids.length === 0) return false;
  const n = await prisma.blogPost.count({
    where: { id: { in: ids }, authorId: session.sub },
  });
  return n > 0;
}

export async function canEditBlogReport(
  session: SessionWithRole | null,
  report: { createdById: string | null; sourcePostIds: unknown }
): Promise<boolean> {
  return canViewBlogReport(session, report);
}
