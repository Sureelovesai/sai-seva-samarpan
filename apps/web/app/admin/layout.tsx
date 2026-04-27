"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const bypassAdminLoginForEventPages =
    pathname === "/admin/events-dashboard" ||
    pathname.startsWith("/admin/add-event") ||
    pathname.startsWith("/admin/manage-events") ||
    pathname.startsWith("/admin/event-signups");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (bypassAdminLoginForEventPages) {
      setChecked(true);
      return;
    }

    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        const user = data?.user;
        if (!user) {
          router.replace("/login");
          return;
        }
        const role = user.role ?? "VOLUNTEER";
        if (role === "VOLUNTEER") {
          router.replace("/");
          return;
        }

        const eventAdminOnly = Boolean(user.eventAdminOnly);
        if (eventAdminOnly) {
          const allowed =
            pathname === "/admin/events-dashboard" ||
            pathname.startsWith("/admin/add-event") ||
            pathname.startsWith("/admin/manage-events") ||
            pathname.startsWith("/admin/event-signups");
          if (!allowed) {
            router.replace("/admin/events-dashboard");
            return;
          }
        }

        if ((role === "SEVA_COORDINATOR" || role === "BLOG_ADMIN") && pathname === "/admin/roles") {
          router.replace("/admin/seva-dashboard");
          return;
        }
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => { cancelled = true; };
  }, [bypassAdminLoginForEventPages, pathname, router]);

  if (!checked && !bypassAdminLoginForEventPages) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-lg font-semibold text-zinc-600">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
