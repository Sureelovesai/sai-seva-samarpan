"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type UpcomingActivity = {
  id: string;
  title: string;
  startDate: string | null;
  city?: string;
};

const CARD_COLORS = [
  "bg-indigo-800",   // dark blue/purple
  "bg-amber-700",    // brown/orange
  "bg-rose-800",     // darker brown/red
  "bg-emerald-800",  // dark green
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const [totalHoursServed, setTotalHoursServed] = useState(0);
  const [totalSevaActivities, setTotalSevaActivities] = useState(0);
  const [upcoming, setUpcoming] = useState<UpcomingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // My Seva Dashboard: show "To view this you should login" when not signed in
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        setAuthChecked(true);
        setIsLoggedIn(!!data?.user);
      })
      .catch(() => {
        if (!cancelled) {
          setAuthChecked(true);
          setIsLoggedIn(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    const emailParam = searchParams.get("email")?.trim() || null;
    async function load() {
      try {
        const url = emailParam
          ? `/api/dashboard/stats?email=${encodeURIComponent(emailParam)}`
          : "/api/dashboard/stats";
        const res = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setTotalHoursServed(data.totalHoursServed ?? 0);
          setTotalSevaActivities(data.totalSevaActivities ?? 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [authChecked, searchParams]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    const emailParam = searchParams.get("email")?.trim() || null;
    async function loadUpcoming() {
      try {
        const url = emailParam
          ? `/api/dashboard/upcoming?email=${encodeURIComponent(emailParam)}`
          : "/api/dashboard/upcoming";
        const res = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || cancelled) return;
        setUpcoming(data);
      } finally {
        if (!cancelled) setUpcomingLoading(false);
      }
    }
    loadUpcoming();
    return () => { cancelled = true; };
  }, [authChecked, searchParams]);

  if (!authChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[#FFF2A8]">
        <p className="text-zinc-600">Loading…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 bg-[#FFF2A8] px-4">
        <p className="text-center text-xl font-semibold text-zinc-800">To view this you should login.</p>
        <Link
          href="/login"
          className="rounded-full bg-[linear-gradient(180deg,#6d28d9,#b91c1c)] px-6 py-3 text-lg font-extrabold tracking-wide text-white shadow-lg transition-colors hover:opacity-90"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FFF2A8]">
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        
        {/* Top image - Love All Serve All */}
        <div className="flex justify-center">
          <div className="relative h-[130px] w-[200px] md:h-[160px] md:w-[240px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/love-all-serve-all.jpg"
              alt="Love All Serve All"
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        {/* Welcome */}
        <h1 className="mt-4 text-center text-3xl font-extrabold tracking-widest text-indigo-800 md:text-5xl">
          WELCOME BACK!
        </h1>

        {/* Stats cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 md:gap-10">
          <StatCard
            value={loading ? "…" : totalHoursServed}
            label="Total Hours Served"
          />
          <StatCard
            value={loading ? "…" : totalSevaActivities}
            label="Total Seva Activities"
          />
        </div>

        {/* Log Hours button - same style as Home page */}
        <div className="mt-10 flex justify-center">
          <Link
            href="/log-hours"
            className="rounded-full bg-[linear-gradient(180deg,#6d28d9,#b91c1c)] px-6 py-4 text-xl font-extrabold tracking-[0.15em] text-white shadow-[0_18px_30px_rgba(0,0,0,0.25)] [text-shadow:0_1px_2px_rgba(0,0,0,0.4)] transition-colors hover:[background:#059669] sm:px-8 sm:py-4 sm:text-2xl sm:tracking-[0.18em] md:px-12 md:py-5 md:text-3xl md:tracking-[0.20em] lg:px-16 lg:py-6 lg:text-4xl"
          >
            Log Hours <span className="ml-2 inline-block text-2xl leading-none sm:ml-3 sm:text-3xl md:text-4xl lg:text-5xl">❣</span>
          </Link>
        </div>

        {/* Upcoming Seva Activities */}
        <div className="mt-10 text-center">
          <h2 className="text-2xl font-extrabold text-indigo-800 md:text-3xl">
            Upcoming Seva Activities
          </h2>

          {upcomingLoading ? (
            <div className="mx-auto mt-6 flex justify-center gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[140px] w-full max-w-[200px] animate-pulse rounded-lg bg-indigo-200/60"
                />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="mx-auto mt-4 max-w-3xl rounded-md bg-white/35 px-6 py-8 text-zinc-700 shadow-sm">
              No upcoming activities yet.
            </div>
          ) : (
            <div className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {upcoming.map((activity, index) => (
                <UpcomingCard
                  key={activity.id}
                  activity={activity}
                  colorClass={CARD_COLORS[index % CARD_COLORS.length]}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function MyDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FFF2A8]">
          <p className="text-zinc-600">Loading…</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function StatCard({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[460px] bg-emerald-900 px-6 py-10 text-center shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
      <div className="text-6xl font-extrabold text-lime-200 md:text-7xl">
        {value}
      </div>
      <div className="mt-4 text-xl font-extrabold text-white md:text-2xl">
        {label}
      </div>
    </div>
  );
}

function formatActivityDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBD";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function UpcomingCard({
  activity,
  colorClass,
}: {
  activity: UpcomingActivity;
  colorClass: string;
}) {
  const dateStr = formatActivityDate(activity.startDate);
  return (
    <Link
      href={`/find-seva?activity=${activity.id}`}
      className={`group block min-h-[140px] overflow-hidden rounded-lg ${colorClass} px-4 py-6 text-center shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2`}
    >
      <div className="flex min-h-full flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-[1.02]">
        <span className="text-lg font-bold text-white drop-shadow-sm md:text-xl">
          {activity.title}
        </span>
        <span className="mt-2 text-sm font-semibold text-white/95 drop-shadow-sm md:text-base">
          {dateStr}
        </span>
      </div>
    </Link>
  );
}