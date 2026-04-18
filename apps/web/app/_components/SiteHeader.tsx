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
  role?: string;
  roles?: string[];
  coordinatorCities?: string[] | null;
  eventAdminOnly?: boolean;
} | null;

// Main nav (Community Network is a dropdown below)
const topLinksAll = [
  { href: "/", label: "Home" },
  { href: "/find-seva", label: "Find Seva" },
  { href: "/dashboard", label: "My Seva Dashboard" },
  { href: "/seva-blog", label: "Seva Blog" },
];

const COMMUNITY_OUTREACH_LINKS = [
  { label: "Community Network", href: "/community-outreach" },
  { label: "Find Community Activity", href: "/find-community-activity" },
  { label: "Partner Organizations", href: "/partner-organizations" },
] as const;

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
  const [communityOpen, setCommunityOpen] = useState(false);
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
    if (!aboutOpen && !resourcesOpen && !communityOpen) return;
    function close() {
      setAboutOpen(false);
      setResourcesOpen(false);
      setCommunityOpen(false);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [aboutOpen, resourcesOpen, communityOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  const communitySectionActive =
    pathname === "/community-outreach" ||
    pathname.startsWith("/community-outreach/") ||
    pathname === "/find-community-activity" ||
    pathname.startsWith("/find-community-activity/") ||
    pathname === "/partner-organizations" ||
    pathname.startsWith("/partner-organizations/");

  const linkClass = (href: string) =>
    `transition-colors ${
      isActive(href)
        ? "text-blue-700 font-semibold underline underline-offset-4 decoration-blue-600"
        : "text-zinc-800 hover:text-blue-700 no-underline"
    }`;

  // Top row: same for everyone (non-logged-in users see "To view this you should login" on dashboard)
  const topLinks = topLinksAll;

  // Volunteer: no admin row. Event-only admin: Event Admin Dashboard only. Seva/Blog/Admin: Seva + Roles rules.
  const roles = user?.roles ?? [];
  const canSeeRoles = roles.includes("ADMIN");
  const canSevaAdminRow =
    roles.includes("ADMIN") ||
    roles.includes("SEVA_COORDINATOR") ||
    roles.includes("REGIONAL_SEVA_COORDINATOR") ||
    roles.includes("NATIONAL_SEVA_COORDINATOR") ||
    roles.includes("BLOG_ADMIN");

  let secondRow: { href: string; label: string }[] = [];
  if (user?.eventAdminOnly) {
    secondRow = [{ href: "/admin/events-dashboard", label: "Event Admin Dashboard" }];
  } else if (canSevaAdminRow) {
    secondRow = canSeeRoles ? [...adminLinks] : adminLinks.filter((l) => l.href !== "/admin/roles");
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
      <div className="mx-auto max-w-6xl px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-2 md:pl-6 md:pr-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center md:mr-10" onClick={() => setMenuOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Sri Sathya Sai Seva Samarpan"
              width={156}
              height={72}
              fetchPriority="high"
              className="h-[88px] w-auto max-w-[200px] object-contain object-left sm:h-[92px] sm:max-w-[220px] md:h-20 md:max-w-[280px]"
            />
          </Link>

          <div className="min-w-0 flex-1 pl-[15px] hidden md:block landscape-desktop:block">
            {/* Same pl-[15px] on this column aligns row 1 (main nav), row 2 (admin), row 3 (login). */}
            <nav className="flex flex-nowrap items-center gap-x-4 overflow-visible pb-0.5 text-sm sm:gap-x-5 sm:text-base">
              <div className="flex min-w-0 flex-nowrap items-center gap-x-4 overflow-x-auto sm:gap-x-5 [scrollbar-width:thin]">
                {topLinks.map((l) => (
                  <Link key={l.href} href={l.href} className={`shrink-0 whitespace-nowrap ${linkClass(l.href)}`}>
                    {l.label}
                  </Link>
                ))}
              </div>
              <div className="relative shrink-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setAboutOpen(false);
                    setResourcesOpen(false);
                    setCommunityOpen((o) => !o);
                  }}
                  className={`inline-flex items-center gap-0.5 whitespace-nowrap transition-colors ${communityOpen || communitySectionActive ? "text-blue-700 font-semibold" : "text-zinc-800 hover:text-blue-700"}`}
                >
                  Community Network
                  <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                </button>
                {communityOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-md border border-slate-200 bg-white py-1 shadow-lg md:left-0 md:right-auto">
                    {COMMUNITY_OUTREACH_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setCommunityOpen(false)}
                        className="block px-4 py-2 text-sm text-zinc-800 hover:bg-slate-100 hover:text-blue-700"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative shrink-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setResourcesOpen(false);
                    setCommunityOpen(false);
                    setAboutOpen((o) => !o);
                  }}
                  className={`inline-flex items-center gap-0.5 whitespace-nowrap transition-colors ${aboutOpen ? "text-blue-700 font-semibold" : "text-zinc-800 hover:text-blue-700"}`}
                >
                  About Us
                  <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                </button>
                {aboutOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-md border border-slate-200 bg-white py-1 shadow-lg md:left-0 md:right-auto">
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
              <div className="relative shrink-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setAboutOpen(false);
                    setCommunityOpen(false);
                    setResourcesOpen((o) => !o);
                  }}
                  className={`inline-flex items-center gap-0.5 whitespace-nowrap transition-colors ${resourcesOpen ? "text-blue-700 font-semibold" : "text-zinc-800 hover:text-blue-700"}`}
                >
                  Resources
                  <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                </button>
                {resourcesOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 min-w-[240px] rounded-md border border-slate-200 bg-white py-1 shadow-lg md:left-0 md:right-auto">
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
            <nav className="mt-0.5 flex flex-wrap items-center gap-x-8 gap-y-1 text-sm sm:text-base">
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
            <div className="mt-0.5 flex flex-wrap items-center gap-x-6 gap-y-1">
              {authChecked && (
                user ? (
                  <>
                    <span className="text-xs text-zinc-600 sm:text-sm">Hi, {user.firstName || user.name || user.email}</span>
                    <button type="button" onClick={handleLogout} className="text-sm font-semibold text-red-600 hover:text-red-700 underline underline-offset-2">
                      Logout
                    </button>
                  </>
                ) : (
                  <Link href="/login" className={linkClass("/login")}>
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
            className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-md text-zinc-700 hover:bg-zinc-100 md:hidden landscape-desktop:hidden"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={`h-0.5 w-6 bg-current transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 w-6 bg-current transition-all ${menuOpen ? "scale-0 opacity-0" : ""}`} />
            <span className={`h-0.5 w-6 bg-current transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>

        {menuOpen && (
          <div className="mt-3 flex flex-col gap-1 border-t border-gray-200 pt-3 md:hidden landscape-desktop:hidden">
            {topLinks.map((l) => (
              <Link key={l.href} href={l.href} className={`block py-2 text-sm ${linkClass(l.href)}`} onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <span className="mt-2 block py-1 text-xs font-semibold text-zinc-500">Community Network</span>
            {COMMUNITY_OUTREACH_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block py-1.5 pl-3 text-sm text-zinc-800 hover:text-blue-700"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <span className="mt-2 block py-1 text-xs font-semibold text-zinc-500">About Us</span>
            {ABOUT_LINKS.map((item) =>
              item.openInNewTab ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="block py-1.5 pl-3 text-sm text-zinc-800 hover:text-blue-700"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={externalViewHref(item.href)}
                  onClick={() => setMenuOpen(false)}
                  className="block py-1.5 pl-3 text-sm text-zinc-800 hover:text-blue-700"
                >
                  {item.label}
                </Link>
              )
            )}
            <span className="mt-2 block py-1 text-xs font-semibold text-zinc-500">Resources</span>
            {RESOURCES_LINKS.map((item) =>
              item.openInNewTab ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="block py-1.5 pl-3 text-sm text-zinc-800 hover:text-blue-700"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={externalViewHref(item.href)}
                  onClick={() => setMenuOpen(false)}
                  className="block py-1.5 pl-3 text-sm text-zinc-800 hover:text-blue-700"
                >
                  {item.label}
                </Link>
              )
            )}
            {secondRow.map((l) => (
              <Link key={l.href} href={l.href} className={`block py-2 text-sm ${linkClass(l.href)}`} onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            {!user && (
              <Link href="/login" className={`block py-2 text-sm ${linkClass("/login")}`} onClick={() => setMenuOpen(false)}>
                Login
              </Link>
            )}
            {user && (
              <button type="button" onClick={() => { setMenuOpen(false); handleLogout(); }} className="block py-2 text-left text-sm font-semibold text-red-600 hover:text-red-700">
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
