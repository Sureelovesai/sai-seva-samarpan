"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/find-seva", label: "Find Seva" },
  { href: "/log-hours", label: "Log Hours" },
  { href: "/dashboard", label: "My Dashboard" },
  { href: "/admin", label: "Admin" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={[
        "rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-base font-semibold">Seva Portal</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{title}</div>
          </div>

          <nav className="hidden gap-2 md:flex">
            {nav.map((n) => (
              <NavLink key={n.href} href={n.href} label={n.label} />
            ))}
          </nav>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
          <div className="flex flex-wrap gap-2">
            {nav.map((n) => (
              <NavLink key={n.href} href={n.href} label={n.label} />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {children}
        </div>
      </main>
    </div>
  );
}
