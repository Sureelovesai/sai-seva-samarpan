"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EventsAdminDashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [isEventAdmin, setIsEventAdmin] = useState(false);
  const [allowedCities, setAllowedCities] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (!cancelled) {
          const user = data?.user;
          
          // If not logged in, redirect to login with return URL
          if (!user) {
            router.push("/login?next=/admin/events-dashboard");
            return;
          }
          
          setUser(user);
          
          // Check if user can access event admin dashboard:
          // - Full ADMIN users can access
          // - Users with EVENT_ADMIN role can access
          const isAdmin = Array.isArray(user?.roles) && user.roles.includes("ADMIN");
          const hasEventAdminRole = Array.isArray(user?.roles) && user.roles.includes("EVENT_ADMIN");
          const hasAccess = isAdmin || hasEventAdminRole;
          
          if (hasAccess) {
            setIsEventAdmin(true);
            if (user?.coordinatorCities && Array.isArray(user.coordinatorCities)) {
              setAllowedCities(user.coordinatorCities);
            }
          } else {
            setIsEventAdmin(false);
          }
          
          setRole(user?.role ?? null);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Auth fetch error:", err);
        if (!cancelled) {
          setIsEventAdmin(false);
          setLoading(false);
          setRole(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50">
      {loading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-600">Loading...</p>
        </div>
      )}

      {!loading && !isEventAdmin && (
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8">
            <p className="text-lg font-semibold text-red-900">Access Denied</p>
            <p className="mt-3 text-sm text-red-700">
              You don't have permission to access the Event Admin Dashboard.
            </p>
            
            <div className="mt-4 rounded border border-red-300 bg-red-100/50 p-3 text-sm text-red-800">
              <p className="font-semibold mb-2">Diagnostic Information:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Your Role:</strong> {role || "(not set)"}</li>
                <li>• <strong>All Roles:</strong> {Array.isArray(user?.roles) ? (user.roles.length > 0 ? user.roles.join(", ") : "None") : "(unable to determine)"}</li>
                <li>• <strong>Event Admin Only:</strong> {String(user?.eventAdminOnly ?? false)}</li>
              </ul>
            </div>
            
            <p className="mt-4 text-sm text-red-700">
              <strong>Required Roles:</strong> "ADMIN" or "EVENT_ADMIN"
            </p>
            
            <p className="mt-3 text-sm text-red-600">
              <strong>How to fix:</strong> An administrator must add your email to the Roles page with "ADMIN" or "EVENT_ADMIN" role assignment. Go to <strong>/admin/roles</strong> to add or verify your role.
            </p>
          </div>
        </div>
      )}

      {!loading && isEventAdmin && (
        <>
          <section className="relative left-1/2 w-screen -translate-x-1/2 border-b border-sky-200/80 shadow-sm">
            <div className="relative h-[140px] w-full sm:h-[160px] md:h-[180px]">
              <Image
                src="/admin-hero.jpg"
                alt=""
                fill
                priority
                className="object-cover object-center brightness-105"
              />
              <div className="absolute inset-0 bg-sky-900/35" />
              <div className="absolute inset-0 flex items-center px-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow sm:text-3xl md:text-4xl">
                    Event Admin Dashboard
                  </h1>
                  <p className="mt-1 text-sm font-medium text-sky-100 sm:text-base">
                    {allowedCities ? `Manage events for: ${allowedCities.join(", ")}` : "Create events, upload flyers, and track Yes / No / Maybe responses"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <DashboardTile
                href="/admin/add-event"
                title="Add Event"
                description="Title, description, date & time, venue, hero image, flyer, RSVP settings"
                accent="from-cyan-600 to-sky-700"
              />
              <DashboardTile
                href="/admin/manage-events"
                title="Manage Events"
                description="Edit, publish, archive, or remove events"
                accent="from-violet-600 to-indigo-700"
              />
              <DashboardTile
                href="/admin/event-signups"
                title="View Sign Ups"
                description="Filter by event; name, email, response, guests"
                accent="from-emerald-600 to-teal-700"
              />
            </div>

            {role && (
              <p className="mt-8 text-center text-xs text-zinc-500">
                Signed in as <span className="font-medium text-zinc-700">{role}</span>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DashboardTile({
  href,
  title,
  description,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${accent} p-6 text-white shadow-lg transition hover:brightness-110 hover:shadow-xl`}
    >
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-white/90">{description}</p>
      <span className="mt-4 text-sm font-semibold underline decoration-white/60 group-hover:no-underline">
        Open →
      </span>
    </Link>
  );
}
