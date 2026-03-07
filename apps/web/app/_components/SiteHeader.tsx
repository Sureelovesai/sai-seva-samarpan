"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  location: string | null;
  role?: "ADMIN" | "VOLUNTEER" | "SEVA_COORDINATOR";
  coordinatorCities?: string[] | null;
} | null;

// Main nav: Home, Find Seva, My Seva Dashboard, Seva Blog (My Seva Dashboard visible to all; non-logged-in users see message on click)
const topLinksAll = [
  { href: "/", label: "Home" },
  { href: "/find-seva", label: "Find Seva" },
  { href: "/dashboard", label: "My Seva Dashboard" },
  { href: "/seva-blog", label: "Seva Blog" },
];

// Add Seva Activity, Seva Sign Ups, Manage Seva: reach from inside Seva Admin Dashboard
const adminLinks = [
  { href: "/admin/seva-dashboard", label: "Seva Admin Dashboard" },
  { href: "/admin/roles", label: "Roles" },
];

const ABOUT_LINKS = [
  { label: "Sri Sathya Sai Global Council", href: "https://www.srisathyasaiglobalcouncil.org/", openInNewTab: true },
  { label: "Sri Sathya Sai Global Council Foundation", href: "https://www.sssgcf.org/", openInNewTab: true },
];
const RESOURCES_LINKS = [
  { label: "Divine Directives & Guidelines", href: "https://ssssoindia.org/divine-directives-guidelines/", openInNewTab: true },
  { label: "Sri Sathya Sai Sahithya", href: "https://www.ssssahitya.org/", openInNewTab: true },
  { label: "Sri Sathya Sai Media Centre", href: "https://www.sssmediacentre.org/", openInNewTab: true },
];

function externalViewHref(url: string) {
  return `/external?url=${encodeURIComponent(url)}`;
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [user, setUser] = useState<AuthUser>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        setUser(data?.user ?? null);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, [pathname]);

  useEffect(() => {
    if (!aboutOpen && !resourcesOpen) return;
    function close() {
      setAboutOpen(false);
      setResourcesOpen(false);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [aboutOpen, resourcesOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const linkClass = (href: string) =>
    `underline underline-offset-4 transition-colors ${
      pathname === href
        ? "text-blue-700 font-semibold decoration-blue-600"
        : "text-zinc-800 hover:text-blue-700"
    }`;

  // Top row: same for everyone (non-logged-in users see "To view this you should login" on dashboard)
  const topLinks = topLinksAll;

  // Volunteer: no admin links. Seva Coordinator: admin links except Roles. Admin: all.
  const secondRow =
    user?.role === "ADMIN"
      ? adminLinks
      : user?.role === "SEVA_COORDINATOR"
        ? adminLinks.filter((l) => l.href !== "/admin/roles")
        : [];

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
      <div className="mx-auto max-w-6xl px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-2 md:pl-16 md:pr-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-0" onClick={() => setMenuOpen(false)}>
            <div className="relative flex h-14 w-[120px] shrink-0 items-center justify-start sm:h-[58px] sm:w-[144px] md:h-[72px] md:w-[156px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-left.jpeg"
                alt="Sri Sathya Sai Seva Samarpan"
                width={156}
                height={72}
                fetchPriority="high"
                className="h-full w-auto max-w-full object-contain object-left"
                style={{
                  imageRendering: "-webkit-optimize-contrast",
                  filter: "contrast(1.15) brightness(1.02) saturate(1.05)",
                }}
              />
            </div>
            <span className="-ml-14 block text-left font-serif text-xs font-extrabold uppercase leading-snug tracking-wide sm:-ml-16 sm:text-sm md:-ml-20 md:text-base" style={{ color: "#1e3a8a", WebkitFontSmoothing: "antialiased", letterSpacing: "0.05em" }}>
              <span className="block">Sri Sathya Sai</span>
              <span className="block">Seva Samarpan</span>
            </span>
          </Link>

          <div className="min-w-0 flex-1 hidden md:block">
            <nav className="flex flex-wrap items-center gap-x-10 gap-y-1 text-[16px] sm:text-lg">
              {topLinks.map((l) => (
                <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                  {l.label}
                </Link>
              ))}
              <div className="relative" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setResourcesOpen(false);
                    setAboutOpen((o) => !o);
                  }}
                  className={`inline-flex items-center gap-0.5 underline underline-offset-4 transition-colors ${aboutOpen ? "text-blue-700 font-semibold decoration-blue-600" : "text-zinc-800 hover:text-blue-700"}`}
                >
                  About Us
                  <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                </button>
                {aboutOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                    {ABOUT_LINKS.map((item) =>
                      item.openInNewTab ? (
                        <a
                          key={item.href}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setAboutOpen(false)}
                          className="block px-4 py-2 text-sm text-zinc-800 hover:bg-slate-100 hover:text-blue-700"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          key={item.href}
                          href={externalViewHref(item.href)}
                          onClick={() => setAboutOpen(false)}
                          className="block px-4 py-2 text-sm text-zinc-800 hover:bg-slate-100 hover:text-blue-700"
                        >
                          {item.label}
                        </Link>
                      )
                    )}
                  </div>
                )}
              </div>
              <div className="relative" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setAboutOpen(false);
                    setResourcesOpen((o) => !o);
                  }}
                  className={`inline-flex items-center gap-0.5 underline underline-offset-4 transition-colors ${resourcesOpen ? "text-blue-700 font-semibold decoration-blue-600" : "text-zinc-800 hover:text-blue-700"}`}
                >
                  Resources
                  <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                </button>
                {resourcesOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[240px] rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                    {RESOURCES_LINKS.map((item) =>
                      item.openInNewTab ? (
                        <a
                          key={item.href}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setResourcesOpen(false)}
                          className="block px-4 py-2 text-sm text-zinc-800 hover:bg-slate-100 hover:text-blue-700"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          key={item.href}
                          href={externalViewHref(item.href)}
                          onClick={() => setResourcesOpen(false)}
                          className="block px-4 py-2 text-sm text-zinc-800 hover:bg-slate-100 hover:text-blue-700"
                        >
                          {item.label}
                        </Link>
                      )
                    )}
                  </div>
                )}
              </div>
            </nav>
            {secondRow.length > 0 && (
            <nav className="mt-2 flex flex-wrap items-center gap-x-12 gap-y-1 text-[16px] sm:text-lg">
              {secondRow.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={linkClass(l.href)}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    router.push(l.href);
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1">
              {authChecked && (
                user ? (
                  <>
                    <span className="text-zinc-600 text-sm">Hi, {user.firstName || user.name || user.email}</span>
                    <button type="button" onClick={handleLogout} className="text-sm font-semibold text-red-600 hover:text-red-700 underline underline-offset-2">
                      Logout
                    </button>
                  </>
                ) : (
                  <Link href="/login" className={pathname === "/login" ? "text-blue-700 font-semibold" : "text-zinc-800 hover:text-blue-700"}>
                    Login
                  </Link>
                )
              )}
            </div>
          </div>

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-md text-zinc-700 hover:bg-zinc-100 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={`h-0.5 w-6 bg-current transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 w-6 bg-current transition-all ${menuOpen ? "scale-0 opacity-0" : ""}`} />
            <span className={`h-0.5 w-6 bg-current transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>

        {menuOpen && (
          <div className="mt-3 flex flex-col gap-1 border-t border-gray-200 pt-3 md:hidden">
            {topLinks.map((l) => (
              <Link key={l.href} href={l.href} className={`block py-2 text-[16px] ${linkClass(l.href)}`} onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <span className="mt-2 block py-1 text-sm font-semibold text-zinc-500">About Us</span>
            {ABOUT_LINKS.map((item) =>
              item.openInNewTab ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="block py-1.5 pl-3 text-[16px] text-zinc-800 hover:text-blue-700"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={externalViewHref(item.href)}
                  onClick={() => setMenuOpen(false)}
                  className="block py-1.5 pl-3 text-[16px] text-zinc-800 hover:text-blue-700"
                >
                  {item.label}
                </Link>
              )
            )}
            <span className="mt-2 block py-1 text-sm font-semibold text-zinc-500">Resources</span>
            {RESOURCES_LINKS.map((item) =>
              item.openInNewTab ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="block py-1.5 pl-3 text-[16px] text-zinc-800 hover:text-blue-700"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={externalViewHref(item.href)}
                  onClick={() => setMenuOpen(false)}
                  className="block py-1.5 pl-3 text-[16px] text-zinc-800 hover:text-blue-700"
                >
                  {item.label}
                </Link>
              )
            )}
            {secondRow.map((l) => (
              <Link key={l.href} href={l.href} className={`block py-2 text-[16px] ${linkClass(l.href)}`} onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            {!user && (
              <Link href="/login" className={`block py-2 text-[16px] ${linkClass("/login")}`} onClick={() => setMenuOpen(false)}>
                Login
              </Link>
            )}
            {user && (
              <button type="button" onClick={() => { setMenuOpen(false); handleLogout(); }} className="block py-2 text-left text-[16px] font-semibold text-red-600 hover:text-red-700">
                Logout
              </button>
            )}
          </div>
        )}
      </div>
      <div className="h-[1px] w-full bg-gray-200" />
    </header>
  );
}
