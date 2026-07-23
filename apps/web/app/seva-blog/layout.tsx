import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/getRole";
import { canAccessSevaBlog } from "@/lib/sevaBlogAccess";

export default async function SevaBlogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id?: string }>;
}) {
  const h = await headers();
  const session = await getSessionWithRole(h.get("cookie"));
  
  if (!session) {
    // Construct the original path
    const resolvedParams = await params;
    let originalPath = "/seva-blog";
    if (resolvedParams?.id) {
      originalPath = `/seva-blog/post/${resolvedParams.id}`;
    }
    
    // Encode both the path and an empty hash (client will add real hash back)
    // This will be decoded on the login page and reapplied after login
    const encodedNext = encodeURIComponent(originalPath);
    redirect(`/login?next=${encodedNext}`);
  }
  
  if (!canAccessSevaBlog(session)) {
    redirect("/");
  }
  
  return <>{children}</>;
}
