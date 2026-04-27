"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function EventsAdminDashboardPage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (!cancelled) {
          setRole(data?.user?.role ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRole(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50">
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
                Create events, upload flyers, and track Yes / No / Maybe responses
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
