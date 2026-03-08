"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SEVA_CATEGORIES, SEVA_CATEGORIES_FOR_FILTER } from "@/lib/categories";
import { CENTERS_FOR_FILTER } from "@/lib/cities";

type RecentSignup = {
  id: string;
  volunteerName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  activityTitle: string;
};

type DashboardStats = {
  totalActivities: number;
  activeActivities: number;
  totalVolunteers: number;
  totalHours: number;
  categoryCounts?: Record<string, number>;
  recentSignups?: RecentSignup[];
};

type AnalyticsData = {
  totalActivities: number;
  activeActivities: number;
  totalVolunteers: number;
  totalHours: number;
  categoryCounts: Record<string, number>;
  cityCounts: Record<string, number>;
  topCategory: string | null;
  topCenter: string | null;
  thisMonthCount: number;
  monthlySevaHours?: { month: string; hours: number }[];
  recentActivities: Array<{
    id: string;
    title: string;
    category: string;
    city: string;
    startDate: string | null;
    status: string;
  }>;
};

type PendingBlogPost = {
  id: string;
  title: string;
  section: string;
  authorName: string | null;
  createdAt: string;
  status: string;
};

export default function SevaAdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "VOLUNTEER" | "SEVA_COORDINATOR" | null>(null);

  // Analytics filters (form state)
  const [filterCenter, setFilterCenter] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  // Applied filters (sent to API when user clicks Apply)
  const [appliedFilters, setAppliedFilters] = useState<{
    center: string;
    category: string;
    from: string;
    to: string;
    search: string;
  }>({ center: "All", category: "All", from: "", to: "", search: "" });

  const [pendingBlogPosts, setPendingBlogPosts] = useState<PendingBlogPost[]>([]);
  const [pendingBlogLoading, setPendingBlogLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        const r = data?.user?.role ?? "VOLUNTEER";
        setRole(r);
      })
      .catch(() => { if (!cancelled) setRole("VOLUNTEER"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (role !== "ADMIN" && role !== "SEVA_COORDINATOR") return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/dashboard-stats", { cache: "no-store", credentials: "include" });
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch (e: any) {
        if (!cancelled) setStatsError(e?.message || "Could not load stats.");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [role]);

  const fetchPendingBlogPosts = useCallback(() => {
    if (role !== "ADMIN") return;
    setPendingBlogLoading(true);
    fetch("/api/admin/blog-posts/pending", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: PendingBlogPost[]) => setPendingBlogPosts(Array.isArray(list) ? list : []))
      .catch(() => setPendingBlogPosts([]))
      .finally(() => setPendingBlogLoading(false));
  }, [role]);

  useEffect(() => {
    if (role !== "ADMIN") return;
    fetchPendingBlogPosts();
  }, [role, fetchPendingBlogPosts]);

  async function approveBlogPost(postId: string) {
    if (approvingId) return;
    setApprovingId(postId);
    try {
      const res = await fetch(`/api/blog-posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (res.ok) fetchPendingBlogPosts();
    } finally {
      setApprovingId(null);
    }
  }

  // Analytics: fetch with applied filters
  const fetchAnalytics = useCallback(() => {
    const params = new URLSearchParams();
    if (appliedFilters.center && appliedFilters.center !== "All") params.set("center", appliedFilters.center);
    if (appliedFilters.category && appliedFilters.category !== "All") params.set("category", appliedFilters.category);
    if (appliedFilters.from) params.set("from", appliedFilters.from);
    if (appliedFilters.to) params.set("to", appliedFilters.to);
    if (appliedFilters.search) params.set("search", appliedFilters.search);
    const qs = params.toString();
    return fetch(`/api/analytics${qs ? `?${qs}` : ""}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => d as AnalyticsData | null);
  }, [appliedFilters]);

  useEffect(() => {
    if (role !== "ADMIN" && role !== "SEVA_COORDINATOR") return;
    let cancelled = false;
    setAnalyticsLoading(true);
    fetchAnalytics()
      .then((d) => {
        if (!cancelled && d) setAnalytics(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => { cancelled = true; };
  }, [role, fetchAnalytics]);

  const handleApplyFilters = () => {
    setAppliedFilters({
      center: filterCenter,
      category: filterCategory,
      from: filterFrom,
      to: filterTo,
      search: filterSearch.trim(),
    });
  };

  const handleResetFilters = () => {
    setFilterCenter("All");
    setFilterCategory("All");
    setFilterFrom("");
    setFilterTo("");
    setFilterSearch("");
    setAppliedFilters({ center: "All", category: "All", from: "", to: "", search: "" });
  };

  const [exportLoading, setExportLoading] = useState(false);

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedFilters.center && appliedFilters.center !== "All") params.set("center", appliedFilters.center);
      if (appliedFilters.category && appliedFilters.category !== "All") params.set("category", appliedFilters.category);
      if (appliedFilters.from) params.set("from", appliedFilters.from);
      if (appliedFilters.to) params.set("to", appliedFilters.to);
      if (appliedFilters.search) params.set("search", appliedFilters.search);
      const res = await fetch(`/api/admin/export-activities?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const data = (await res.json()) as Array<{
        title: string;
        category: string;
        city: string;
        startDate: string | null;
        endDate: string | null;
        startTime: string | null;
        endTime: string | null;
        status: string;
        isActive: boolean;
        capacity: number | null;
        signupCount: number;
      }>;
      const rows: string[][] = [
        ["Title", "Category", "Center", "Start Date", "End Date", "Start Time", "End Time", "Status", "Active", "Capacity", "Signups"],
        ...data.map((a) => [
          a.title,
          a.category,
          a.city,
          a.startDate ? new Date(a.startDate).toLocaleDateString() : "",
          a.endDate ? new Date(a.endDate).toLocaleDateString() : "",
          a.startTime ?? "",
          a.endTime ?? "",
          a.status,
          a.isActive ? "Yes" : "No",
          a.capacity != null ? String(a.capacity) : "",
          String(a.signupCount),
        ]),
      ];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `seva-activities-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Could add toast or inline error
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_35%_15%,rgba(255,255,255,0.75),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(190,200,220,0.9),rgba(110,210,230,0.75),rgba(190,200,220,0.9))]">
      {/* ================= HERO (FULL WIDTH) ================= */}
      <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.22)]">
        <div className="relative h-[140px] w-full sm:h-[160px] md:h-[200px]">
          <Image
            src="/admin-hero.jpg"
            alt="Seva Admin Dashboard Banner"
            fill
            priority
            className="object-cover object-center brightness-105 contrast-[1.04]"
          />
          <div className="absolute inset-0 bg-black/18" />

          <div className="absolute inset-0 flex items-center justify-start">
            <div className="w-full max-w-[12rem] pl-5 pr-2 sm:max-w-sm sm:pl-10 sm:pr-6 md:max-w-2xl lg:max-w-6xl">
              <div className="text-xl font-semibold leading-tight tracking-wide text-indigo-500 sm:text-3xl md:text-4xl lg:text-5xl lg:leading-normal">
                Seva Admin Dashboard
              </div>

              <div className="mt-2 text-sm font-semibold leading-tight text-white sm:mt-3 sm:text-lg md:text-xl lg:text-2xl lg:leading-normal">
                Manage Seva Activities and Volunteers
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTAINER ================= */}
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-12">
        {/* ================= TILE ROW ================= */}
        <section className="mt-6">
          <div className="bg-yellow-200/85 px-4 py-6 shadow-[0_10px_25px_rgba(0,0,0,0.16)]">
            <div
              className={
                role === "ADMIN"
                  ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
                  : "grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
              }
            >
              <AdminTile
                href="/admin/add-seva-activity"
                imgSrc="/tile-add-seva.jpg"
                imgAlt="Add Seva"
                buttonText="Add Seva"
              />
              <AdminTile
                href="/admin/manage-seva"
                imgSrc="/tile-manage-seva.jpg"
                imgAlt="Manage Seva"
                buttonText="Manage Seva"
              />
              <AdminTile
                href="/admin/seva-signups"
                imgSrc="/tile-signups.jpg"
                imgAlt="View Sign Ups"
                buttonText="View Sign Ups"
              />
              {role === "ADMIN" && (
                <AdminTile
                  href="/admin/roles"
                  buttonText="Roles"
                  titleText="Roles"
                  titleBackgroundClass="bg-indigo-800"
                />
              )}
            </div>
          </div>
        </section>

        {/* ================= PENDING BLOG POSTS (ADMIN ONLY) ================= */}
        {role === "ADMIN" && (
          <section className="mt-8 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/90 px-6 py-6 shadow-md">
            <div className="flex items-center justify-center gap-4 border-b border-amber-200 pb-4">
              <span className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-amber-700" aria-hidden />
              <h2 className="text-xl font-extrabold tracking-wide text-amber-800 sm:text-2xl">Pending Blog Posts</h2>
              <span className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-amber-700" aria-hidden />
            </div>
            <p className="mt-2 text-center text-sm text-amber-800/90">
              New posts are sent for verification. Approve a post to make it visible on the Seva Blog.
            </p>
            {pendingBlogLoading ? (
              <p className="mt-4 text-center text-amber-800">Loading…</p>
            ) : pendingBlogPosts.length === 0 ? (
              <p className="mt-4 text-center text-amber-800/80">No posts pending verification.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {pendingBlogPosts.map((post) => (
                  <li
                    key={post.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-800">{post.title}</span>
                      <span className="ml-2 text-sm text-slate-500">{post.section}</span>
                      {post.authorName && (
                        <span className="ml-2 text-sm text-slate-500">by {post.authorName}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => approveBlogPost(post.id)}
                      disabled={approvingId === post.id}
                      className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-800 disabled:opacity-60"
                    >
                      {approvingId === post.id ? "Approving…" : "Approve"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ================= OUR IMPACT ================= */}
        <section className="mt-10 overflow-hidden rounded-xl border border-slate-200 bg-green-50/90 px-6 py-6 shadow-md">
          <div className="flex items-center justify-center gap-4 border-b border-amber-200/80 pb-4">
            <span className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-amber-700" aria-hidden />
            <h2 className="text-3xl font-extrabold tracking-[0.35em] text-amber-800">Our Impact</h2>
            <span className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-amber-700" aria-hidden />
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ImpactCard
              value={statsError ? "—" : stats ? String(stats.totalActivities) : "…"}
              label="Total Activities"
            />
            <ImpactCard
              value={statsError ? "—" : stats ? String(stats.activeActivities) : "…"}
              label="Active Activities"
            />
            <ImpactCard
              value={statsError ? "—" : stats ? String(stats.totalVolunteers) : "…"}
              label="Total Volunteers"
            />
            <ImpactCard
              value={statsError ? "—" : stats ? String(stats.totalHours) : "…"}
              label="Total Hours"
            />
          </div>
        </section>

        {/* ================= ANALYTICS ================= */}
        <section className="mt-10 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-lg">
          {/* Title */}
          <div className="border-b border-slate-700 px-6 py-4">
            <div className="flex items-center justify-center gap-4">
              <span className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-slate-500 sm:max-w-[120px]" aria-hidden />
              <h2 className="text-2xl font-extrabold tracking-[0.2em] text-white sm:text-3xl sm:tracking-[0.35em]">
                Analytics
              </h2>
              <span className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-slate-500 sm:max-w-[120px]" aria-hidden />
            </div>
          </div>

          {/* Filters */}
          <div className="border-b border-slate-700 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <div className="min-w-[120px] flex-1 sm:flex-none">
                <label className="block text-xs font-semibold text-slate-300">Center</label>
                <select
                  value={filterCenter}
                  onChange={(e) => setFilterCenter(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  <option value="All">All Centers</option>
                  {CENTERS_FOR_FILTER.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[120px] flex-1 sm:flex-none">
                <label className="block text-xs font-semibold text-slate-300">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  <option value="All">All Categories</option>
                  {SEVA_CATEGORIES_FOR_FILTER.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[100px]">
                <label className="block text-xs font-semibold text-slate-300">From</label>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              <div className="min-w-[100px]">
                <label className="block text-xs font-semibold text-slate-300">To</label>
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              <div className="min-w-[140px] flex-1 sm:min-w-[160px]">
                <label className="block text-xs font-semibold text-slate-300">To search...</label>
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="To search..."
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-600"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={exportLoading}
                  className="rounded border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                >
                  {exportLoading ? "Exporting…" : "Export CSV"}
                </button>
              </div>
            </div>
          </div>

          {/* Data */}
          {analyticsLoading ? (
            <div className="px-6 py-12 text-center text-slate-400">
              Loading analytics…
            </div>
          ) : analytics ? (
            <AnalyticsBlock data={analytics} />
          ) : (
            <div className="px-6 py-12 text-center text-slate-500">
              Could not load analytics
            </div>
          )}
        </section>

        {/* ================= ACTIVITIES BY CATEGORY (title + content same background) ================= */}
        <section className="mt-10 overflow-hidden rounded-xl bg-indigo-600/80 px-6 py-8 shadow-md">
          <div className="flex items-center justify-center gap-4 pb-6">
            <span className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-white/50" aria-hidden />
            <h2 className="text-2xl font-extrabold tracking-[0.2em] text-white sm:text-3xl sm:tracking-[0.35em]">
              Activities by Category
            </h2>
            <span className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-white/50" aria-hidden />
          </div>
          <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5">
            {SEVA_CATEGORIES.map((category) => (
              <CategoryCard
                key={category}
                category={category}
                count={stats?.categoryCounts?.[category] ?? 0}
              />
            ))}
          </div>

          {/* ================= RECENT SIGNUPS ================= */}
          <div className="mt-12">
            <div className="flex items-center justify-center gap-4">
              <span className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-white/50" aria-hidden />
              <span className="text-3xl font-extrabold tracking-[0.25em] text-white">Recent Signups</span>
              <span className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-white/50" aria-hidden />
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {(stats?.recentSignups?.length ? stats.recentSignups : []).map((s) => (
                <SignupCard key={s.id} signup={s} />
              ))}
              {(!stats?.recentSignups?.length || stats.recentSignups.length < 3) &&
                Array.from({ length: 3 - (stats?.recentSignups?.length ?? 0) }, (_, i) => (
                  <SignupCard key={`empty-${i}`} signup={null} />
                ))}
            </div>
          </div>
        </section>

        {/* ================= EXPORT CSV ================= */}
        <section className="mt-10">
          <div className="mx-auto max-w-5xl bg-yellow-200/85 px-6 py-10 shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
            <div className="text-center text-3xl font-semibold underline">
              Export CSV
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-zinc-900">
                  From Date
                </label>
                <input
                  type="date"
                  className="mt-2 w-full rounded-none border border-zinc-700 bg-white px-4 py-3 text-zinc-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-900">
                  To Date
                </label>
                <input
                  type="date"
                  className="mt-2 w-full rounded-none border border-zinc-700 bg-white px-4 py-3 text-zinc-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-900">
                  Signup Status
                </label>
                <select className="mt-2 w-full rounded-none border border-zinc-700 bg-white px-4 py-3 text-zinc-900 outline-none">
                  <option>Status</option>
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button className="rounded-full bg-emerald-800 px-12 py-3 text-base font-semibold italic text-white shadow hover:bg-emerald-900">
                Export
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function AnalyticsBlock({ data, theme = "dark" }: { data: AnalyticsData; theme?: "light" | "dark" }) {
  const isLight = theme === "light";
  const maxCat = Math.max(1, ...Object.values(data.categoryCounts));
  const maxCity = Math.max(1, ...Object.values(data.cityCounts));
  const cardBg = isLight
    ? {
        active: "rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white",
        volunteers: "rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-white",
        hours: "rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white",
        month: "rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-white",
        category: "rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 to-white",
        center: "rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50 to-white",
      }
    : {
        active: "rounded-lg bg-gradient-to-br from-emerald-900/50 to-slate-800",
        volunteers: "rounded-lg bg-gradient-to-br from-blue-900/50 to-slate-800",
        hours: "rounded-lg bg-gradient-to-br from-amber-900/50 to-slate-800",
        month: "rounded-lg bg-gradient-to-br from-violet-900/50 to-slate-800",
        category: "rounded-lg bg-gradient-to-br from-indigo-900/50 to-slate-800",
        center: "rounded-lg bg-gradient-to-br from-rose-900/50 to-slate-800",
      };
  const cardText = isLight ? "text-slate-800" : "text-white";
  const cardMuted = isLight ? "text-slate-500" : "text-slate-400";
  const chartCard = isLight ? "rounded-xl border border-slate-400/60 bg-slate-100/95 shadow-sm" : "rounded-lg border border-slate-700 bg-slate-800/50";
  const chartTitle = isLight ? "text-slate-800" : "text-white";
  const tableWrap = isLight ? "rounded-xl border border-slate-400/60 bg-slate-100/95 shadow-sm" : "rounded-lg border border-slate-700";
  const tableHead = isLight ? "border-slate-300 bg-slate-200/80 text-slate-800" : "border-slate-700 bg-slate-800 text-slate-300";
  const tableRow = isLight ? "border-slate-200 hover:bg-slate-200/50" : "border-slate-700/70 hover:bg-slate-800/70";
  const tableCell = isLight ? "text-slate-700" : "text-slate-300";
  const linkClr = isLight ? "text-indigo-600 hover:underline" : "text-indigo-300 hover:underline";
  return (
    <div className={`px-6 py-8 ${isLight ? "text-slate-800" : "text-slate-100"}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className={`${cardBg.active} px-4 py-3`}>
          <div className={`text-2xl font-bold ${cardText}`}>{data.activeActivities}</div>
          <div className={`text-sm ${cardMuted}`}>Active Projects</div>
        </div>
        <div className={`${cardBg.volunteers} px-4 py-3`}>
          <div className={`text-2xl font-bold ${cardText}`}>{data.totalVolunteers}</div>
          <div className={`text-sm ${cardMuted}`}>Volunteers</div>
        </div>
        <div className={`${cardBg.hours} px-4 py-3`}>
          <div className={`text-2xl font-bold ${cardText}`}>{data.totalHours}</div>
          <div className={`text-sm ${cardMuted}`}>Seva Hours</div>
        </div>
        <div className={`${cardBg.month} px-4 py-3`}>
          <div className={`text-2xl font-bold ${cardText}`}>{data.thisMonthCount}</div>
          <div className={`text-sm ${cardMuted}`}>This Month</div>
        </div>
        <div className={`${cardBg.category} px-4 py-3`}>
          <div className="flex items-center gap-2">
            <svg className={`h-5 w-5 shrink-0 ${isLight ? "text-indigo-500" : "text-indigo-300"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            </svg>
            <span className={`text-lg font-bold truncate ${cardText}`}>{data.topCategory ?? "—"}</span>
          </div>
          <div className={`text-sm ${cardMuted}`}>Top Category</div>
        </div>
        <div className={`${cardBg.center} px-4 py-3`}>
          <div className="flex items-center gap-2">
            <svg className={`h-5 w-5 shrink-0 ${isLight ? "text-rose-500" : "text-rose-300"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className={`text-lg font-bold truncate ${cardText}`}>{data.topCenter ?? "—"}</span>
          </div>
          <div className={`text-sm ${cardMuted}`}>Top Center</div>
        </div>
      </div>

      {/* Charts + Engagement row: compact 2-column layout */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Left column: Category Distribution (bar chart) + Center Comparison (compact) */}
        <div className="space-y-6">
          <div className={`${chartCard} px-4 py-3`}>
            <h3 className={`mb-3 text-sm font-semibold ${chartTitle}`}>Category Distribution</h3>
            <div className="flex items-end justify-between gap-1" style={{ minHeight: "140px" }}>
              {[
                ...SEVA_CATEGORIES.map((name) => ({ name, count: data.categoryCounts[name] ?? 0 })),
                ...Object.entries(data.categoryCounts)
                  .filter(([name]) => !SEVA_CATEGORIES.includes(name as (typeof SEVA_CATEGORIES)[number]))
                  .map(([name, count]) => ({ name, count })),
              ]
                .sort((a, b) => b.count - a.count)
                .slice(0, 8)
                .map(({ name, count }) => (
                  <div key={name} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full min-w-0 rounded-t bg-indigo-500 transition-all"
                      style={{
                        height: `${Math.max(8, (count / maxCat) * 120)}px`,
                        minHeight: "4px",
                      }}
                      title={`${name}: ${count}`}
                    />
                    <span className={`truncate text-center text-[10px] ${cardMuted}`} title={name}>
                      {name.replace(/\s*(&|and)\s*.*$/i, "").slice(0, 8)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
          <div className={`${chartCard} px-4 py-3`}>
            <h3 className={`mb-3 text-sm font-semibold ${chartTitle}`}>Center Comparison</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.cityCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([name, count]) => (
                  <div
                    key={name}
                    className={isLight ? "rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700" : "rounded-md bg-slate-700/80 px-3 py-1.5 text-sm text-slate-200"}
                    title={`${name}: ${count} activities`}
                  >
                    <span className={isLight ? "font-medium text-slate-800" : "font-medium text-white"}>{name}</span>
                    <span className={`ml-1.5 ${cardMuted}`}>{count}</span>
                  </div>
                ))}
              {Object.keys(data.cityCounts).length === 0 && (
                <span className={`text-sm ${cardMuted}`}>No centers</span>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Monthly Seva Hours Trend + Engagement & Status */}
        <div className="space-y-6">
          <div className={`${chartCard} px-4 py-3`}>
            <h3 className={`mb-3 text-sm font-semibold ${chartTitle}`}>Monthly Seva Hours Trend</h3>
            <MonthlyHoursLineChart data={data.monthlySevaHours ?? []} theme={theme} />
          </div>
          <div className={`${chartCard} px-4 py-3`}>
            <h3 className={`mb-3 text-sm font-semibold ${chartTitle}`}>Engagement & Status</h3>
            <EngagementBlock data={data} theme={theme} />
          </div>
        </div>
      </div>

      {/* Projects & Activities: scrollable table */}
      <div className="mt-6">
        <h3 className={`mb-3 text-sm font-semibold ${chartTitle}`}>Projects & Activities</h3>
        <div className={`overflow-hidden ${tableWrap}`}>
          <div className="max-h-[280px] overflow-y-auto overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className={`sticky top-0 z-10 border-b ${tableHead}`}>
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.recentActivities ?? []).map((a) => (
                  <tr key={a.id} className={`border-b ${tableRow}`}>
                    <td className="px-3 py-2">
                      <Link
                        href={`/seva-activities?id=${a.id}`}
                        className={`font-medium ${linkClr}`}
                      >
                        {a.title}
                      </Link>
                    </td>
                    <td className={`px-3 py-2 ${tableCell}`}>{a.category}</td>
                    <td className={`px-3 py-2 ${tableCell}`}>{a.city}</td>
                    <td className={`px-3 py-2 ${tableCell}`}>
                      {a.startDate
                        ? new Date(a.startDate).toLocaleDateString(undefined, { dateStyle: "medium" })
                        : "Date TBD"}
                    </td>
                    <td className={`px-3 py-2 ${tableCell}`}>{a.status}</td>
                  </tr>
                ))}
                {(data.recentActivities?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      No recent activities
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthlyHoursLineChart({ data, theme = "dark" }: { data: { month: string; hours: number }[]; theme?: "light" | "dark" }) {
  if (data.length === 0) {
    return <div className="flex h-[100px] items-center justify-center text-sm text-slate-500">No data</div>;
  }
  const maxH = Math.max(1, ...data.map((d) => d.hours));
  const labels = data.map((d) => {
    const [y, m] = d.month.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString(undefined, { month: "short" });
  });
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = 100 - (d.hours / maxH) * 90;
    return `${x},${y}`;
  });
  const pathD = pts.length ? `M ${pts.map((p) => p.replace(",", " ")).join(" L ")}` : "";
  const labelClr = theme === "light" ? "text-slate-500" : "text-slate-500";
  return (
    <div>
      <div className="h-[100px] w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <path
            d={pathD}
            fill="none"
            stroke="rgb(99, 102, 241)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {data.map((d, i) => {
            const x = (i / (data.length - 1 || 1)) * 100;
            const y = 100 - (d.hours / maxH) * 90;
            return (
              <circle
                key={d.month}
                cx={x}
                cy={y}
                r="2.5"
                fill="rgb(99, 102, 241)"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>
      <div className={`mt-1 flex justify-between text-[10px] ${labelClr}`}>
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function EngagementBlock({ data, theme = "dark" }: { data: AnalyticsData; theme?: "light" | "dark" }) {
  const isLight = theme === "light";
  const categoryEntries = Object.entries(data.categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalCat = categoryEntries.reduce((s, [, c]) => s + c, 0) || 1;
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
  const emerald = isLight ? "text-emerald-600" : "text-emerald-400";
  const amber = isLight ? "text-amber-600" : "text-amber-400";
  const blue = isLight ? "text-blue-600" : "text-blue-400";
  const donutLabel = isLight ? "text-slate-500" : "text-slate-400";
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex flex-1 flex-wrap gap-3 text-sm">
        <div className={`flex items-center gap-1.5 ${emerald}`}>
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <span>Active volunteers: {data.totalVolunteers}</span>
        </div>
        <div className={`flex items-center gap-1.5 ${amber}`}>
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span>This month: {data.thisMonthCount} activities</span>
        </div>
        <div className={`flex items-center gap-1.5 ${blue}`}>
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Total hours: {data.totalHours}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative h-14 w-14">
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            {categoryEntries.map(([, count], i) => {
              const pct = (count / totalCat) * 100;
              const dash = (pct / 100) * 100;
              const offset = categoryEntries
                .slice(0, i)
                .reduce((s, [, c]) => s + (c / totalCat) * 100, 0);
              return (
                <circle
                  key={i}
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth="6"
                  strokeDasharray={`${dash} ${100 - dash}`}
                  strokeDashoffset={-offset}
                />
              );
            })}
          </svg>
        </div>
        <span className={`text-xs ${donutLabel}`}>By category</span>
      </div>
    </div>
  );
}

function AdminTile(props: {
  href: string;
  imgSrc?: string;
  imgAlt?: string;
  buttonText: string;
  /** When set, show text + background instead of an image in the top block */
  titleText?: string;
  titleBackgroundClass?: string;
}) {
  const useTextBlock = Boolean(props.titleText);
  return (
    <div className="overflow-hidden bg-yellow-200/85 shadow-[0_10px_25px_rgba(0,0,0,0.20)]">
      <div className={`relative h-[160px] w-full ${useTextBlock ? "" : "bg-white"}`}>
        {useTextBlock ? (
          <div
            className={`flex h-full w-full items-center justify-center ${props.titleBackgroundClass ?? "bg-slate-700"}`}
          >
            <span className="text-3xl font-bold tracking-wide text-white md:text-4xl">
              {props.titleText}
            </span>
          </div>
        ) : (
          <Image
            src={props.imgSrc!}
            alt={props.imgAlt ?? ""}
            fill
            className="object-cover"
          />
        )}
      </div>

      {/* Rounded pill button - same as other 3 tiles */}
      <div className="flex min-h-[88px] items-center justify-center py-5">
        <Link
          href={props.href}
          className="inline-flex min-h-[52px] min-w-0 items-center justify-center gap-4 rounded-full bg-emerald-800 px-10 py-3.5 text-lg font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:bg-emerald-900"
        >
          <span className="min-h-[1.5rem] leading-tight">{props.buttonText}</span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl leading-none">
            ›
          </span>
        </Link>
      </div>
    </div>
  );
}

function SectionTitle(props: { title: string; variant: "impact" | "analytics" }) {
  if (props.variant === "analytics") {
    return (
      <div className="mt-10">
        <div className="rounded-lg bg-slate-800 px-6 py-4 shadow-md">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-slate-500" aria-hidden />
            <span className="text-2xl font-extrabold tracking-[0.2em] text-white sm:text-3xl sm:tracking-[0.35em]">
              {props.title}
            </span>
            <span className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-slate-500" aria-hidden />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-10">
      <div className="flex items-center justify-center gap-4">
        <span className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-amber-700" aria-hidden />
        <span className="text-3xl font-extrabold tracking-[0.35em] text-amber-800">{props.title}</span>
        <span className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-amber-700" aria-hidden />
      </div>
    </div>
  );
}

function ImpactCard(props: { value: string; label: string }) {
  return (
    <div className="mx-auto w-full max-w-[220px] bg-green-200 px-6 py-10 text-center shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
      <div className="text-3xl font-extrabold text-slate-800">{props.value}</div>
      <div className="mt-6 text-2xl font-extrabold text-amber-900">{props.label}</div>
    </div>
  );
}

function CategoryCard(props: { category: string; count: number }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col bg-green-200 px-6 py-6 shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
      <div className="min-h-[3.5rem] flex-1 text-lg font-extrabold text-amber-800">{props.category}</div>
      <div className="mt-auto border-t border-amber-800/30 pt-3 text-2xl font-bold text-indigo-950">{props.count}</div>
    </div>
  );
}

function SignupCard(props: { signup: RecentSignup | null }) {
  const s = props.signup;
  if (!s) {
    return (
      <div className="bg-green-200/80 px-6 py-10 shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
        <div className="text-center text-lg font-semibold text-zinc-500">No signup</div>
      </div>
    );
  }
  const dateStr = s.createdAt
    ? new Date(s.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";
  return (
    <div className="bg-green-200 px-6 py-10 shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
      <div className="space-y-4">
        <div>
          <div className="text-sm font-semibold text-amber-800">Name</div>
          <div className="text-lg font-bold text-indigo-950">{s.volunteerName}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-amber-800">Activity</div>
          <div className="text-lg font-bold text-indigo-950">{s.activityTitle}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-amber-800">Email</div>
          <div className="text-lg font-bold text-indigo-950">{s.email}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-amber-800">Status</div>
          <div className="text-lg font-bold text-indigo-950">{s.status}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-amber-800">Date</div>
          <div className="text-lg font-bold text-indigo-950">{dateStr}</div>
        </div>
      </div>
    </div>
  );
}