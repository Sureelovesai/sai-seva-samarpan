import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppPageLoader } from "@/app/_components/AppPageLoader";
import SevaBlogClient from "./SevaBlogClient";
import { getSessionWithRole } from "@/lib/getRole";
import { canViewSevaBlog } from "@/lib/sevaBlogAccess";

export default async function SevaBlogPage() {
  const h = await headers();
  const session = await getSessionWithRole(h.get("cookie"));

  if (!session) {
    redirect("/login?next=" + encodeURIComponent("/seva-blog"));
  }

  if (!canViewSevaBlog(session)) {
    redirect("/");
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] bg-[#fdf2f0]">
          <AppPageLoader
            layout="section"
            label="Loading Seva Blog"
            message="Loading stories…"
            size="lg"
            className="py-20"
          />
        </div>
      }
    >
      <SevaBlogClient />
    </Suspense>
  );
}
