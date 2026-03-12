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
  const [checked, setChecked] = useState(false);

  useEffect(() => {
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
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-lg font-semibold text-zinc-600">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
