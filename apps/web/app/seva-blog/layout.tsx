import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/getRole";
import { canAccessSevaBlog } from "@/lib/sevaBlogAccess";

export default async function SevaBlogLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const session = await getSessionWithRole(h.get("cookie"));
  if (!session) {
    redirect("/login?next=" + encodeURIComponent("/seva-blog"));
  }
  if (!canAccessSevaBlog(session)) {
    redirect("/");
  }
  return <>{children}</>;
}
