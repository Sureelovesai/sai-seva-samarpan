import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/getRole";
import { canAccessSevaBlog } from "@/lib/sevaBlogAccess";

export default async function PostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const h = await headers();
  const session = await getSessionWithRole(h.get("cookie"));

  if (!session) {
    const resolvedParams = await params;
    const postId = resolvedParams?.id;
    
    // Redirect with the full post path including the ID
    const originalPath = postId 
      ? `/seva-blog/post/${postId}` 
      : "/seva-blog";
    
    redirect("/login?next=" + encodeURIComponent(originalPath));
  }

  if (!canAccessSevaBlog(session)) {
    redirect("/");
  }

  return <>{children}</>;
}
