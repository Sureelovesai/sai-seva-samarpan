"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Activity = {
  id: string;
  title: string;
  category: string;
  city: string;
  description: string | null;
  isActive: boolean;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

/** Last calendar day of the activity (UTC date key); same logic as public listings. */
function isPastBySchedule(a: Pick<Activity, "startDate" | "endDate">): boolean {
  const last = a.endDate ?? a.startDate;
  if (!last) return false;
  const lastKey = new Date(last).toISOString().slice(0, 10);
  const todayKey = new Date().toISOString().slice(0, 10);
  return lastKey < todayKey;
}

/** Label for the list: date completion overrides the Active flag. */
function scheduleStatusLabel(a: Activity): "Completed" | "Active" | "Inactive" {
  if (isPastBySchedule(a)) return "Completed";
  return a.isActive ? "Active" : "Inactive";
}

function uniqById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function ManageSevaPage() {
  const [status, setStatus] = useState<"All" | "Active" | "Inactive">("All");
  const [q, setQ] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seva-activities", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load activities");
      const data = await res.json();
      setActivities(uniqById(Array.isArray(data) ? data : []));
    } catch (e: any) {
      setError(e?.message || "Could not load activities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  async function handleDeleteActivity(id: string, title: string) {
    const msg =
      `Delete "${title}"?\n\nThis cannot be undone. All volunteers who signed up (pending or approved) will receive an email that the activity was cancelled, with coordinator contact information.`;
    if (!confirm(msg)) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/seva-activities/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.detail || "Delete failed");
      }
      await loadActivities();
    } catch (e: unknown) {
      setError((e as Error)?.message || "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return activities.filter((a) => {
      const label = scheduleStatusLabel(a);
      const okStatus =
        status === "All"
          ? true
          : status === "Active"
            ? label === "Active"
            : label === "Inactive" || label === "Completed";
      const meta = [a.category, a.city, a.description].filter(Boolean).join(" ");
      const okText =
        !text ||
        a.title.toLowerCase().includes(text) ||
        meta.toLowerCase().includes(text);
      return okStatus && okText;
    });
  }, [activities, status, q]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_35%_15%,rgba(255,255,255,0.75),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(90,140,240,0.75),rgba(200,210,235,0.7),rgba(190,170,210,0.75))]">
      {/* Full-width HERO */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 border-t border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
        <div className="relative">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(95,90,170,0.9),rgba(120,120,140,0.75),rgba(190,180,90,0.75))]" />

          <div className="relative mx-auto max-w-6xl px-4 py-10">
            <div className="grid min-w-0 grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
              {/* Left — left-aligned on mobile and desktop so no right-align or extra left space */}
              <div className="min-w-0 text-left">
                <div className="text-5xl font-extrabold italic tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)] md:text-6xl">
                  Manage SEVA -
                </div>
                <div className="mt-3 text-2xl font-bold italic text-white/95 drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]">
                  View and Edit Seva Activities
                </div>

                <div className="mt-6 flex w-full max-w-[360px] justify-start">
                  <div className="relative h-[170px] w-full min-w-0 bg-white shadow-[0_10px_25px_rgba(0,0,0,0.25)]">
                    <Image
                      src="/manage-card.jpg"
                      alt="Manage card"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
              </div>

              {/* Right — responsive so image never cuts on small screens */}
              <div className="flex min-w-0 justify-center md:justify-end">
                <div className="relative h-[260px] w-full max-w-[460px] min-w-0 bg-white/40 shadow-[0_10px_25px_rgba(0,0,0,0.25)] md:h-[320px]">
                  <Image
                    src="/swami-manage.jpg"
                    alt="Swami"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-1 w-full bg-cyan-300/60" />
        </div>
      </section>

      {/* Page content */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadActivities}
            disabled={loading}
            className="bg-teal-950 px-16 py-3 text-sm font-semibold tracking-[0.35em] text-white shadow hover:bg-teal-900 disabled:opacity-70"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mt-6 text-center text-lg font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-10 rounded-none bg-white/90 px-8 py-8 shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
          <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:items-end">
            <div>
              <label className="block text-lg font-semibold text-zinc-900">
                Seva Activity – Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "All" | "Active" | "Inactive")}
                className="mt-3 w-full rounded-none border border-zinc-700 bg-white px-5 py-4 text-zinc-900 outline-none"
              >
                <option value="All">All</option>
                <option value="Active">Active (scheduled, not ended)</option>
                <option value="Inactive">Inactive or completed</option>
              </select>
            </div>

            <div>
              <label className="block text-lg font-semibold text-zinc-900">
                Search
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title / category / city"
                className="mt-3 w-full rounded-none border border-zinc-700 bg-white px-5 py-4 text-zinc-900 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-8">
          {filtered.map((a) => {
            const listStatus = scheduleStatusLabel(a);
            return (
            <div
              key={a.id}
              className="rounded-none bg-zinc-200/90 px-10 py-10 shadow-[0_10px_25px_rgba(0,0,0,0.18)]"
            >
              <div className="grid gap-6 md:grid-cols-[1fr_220px_280px] md:items-center">
                <div>
                  <div className="text-3xl font-extrabold text-zinc-800">
                    {a.title}
                  </div>
                  <div className="mt-6 text-2xl font-extrabold text-amber-800">
                    {a.category} · {a.city}
                  </div>
                </div>

                <div className="text-center md:text-left">
                  <div
                    className={`text-lg font-bold ${
                      listStatus === "Completed"
                        ? "text-zinc-600"
                        : listStatus === "Active"
                          ? "text-emerald-800"
                          : "text-amber-800"
                    }`}
                  >
                    {listStatus}
                  </div>
                  <div className="mt-6 flex flex-col gap-3">
                    <Link
                      href={`/admin/manage-seva/${a.id}`}
                      className="inline-block w-[170px] bg-blue-500 px-10 py-3 text-center text-white shadow hover:bg-blue-600"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === a.id}
                      onClick={() => handleDeleteActivity(a.id, a.title)}
                      className="w-[170px] border-2 border-red-700 bg-white px-6 py-3 text-center text-sm font-semibold text-red-700 shadow hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === a.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 md:items-start">
                  <Link
                    href={`/admin/seva-signups?activityId=${encodeURIComponent(a.id)}`}
                    className="inline-flex items-center gap-4 rounded-full bg-emerald-800 px-10 py-4 text-base tracking-[0.35em] text-white shadow hover:bg-emerald-900"
                  >
                    <span>View Sign Ups</span>
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-white/70">
                      ✓
                    </span>
                  </Link>
                </div>
              </div>
            </div>
            );
          })}

          {!loading && !error && filtered.length === 0 && (
            <div className="rounded-none bg-white/80 p-8 text-center text-zinc-800 shadow">
              No activities match your filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
