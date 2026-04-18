"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  title: string;
  category: string;
  city: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
  status: string;
  capacity: number | null;
  organizationName: string | null;
  createdAt: string;
  _count: { signups: number };
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, mo, day] = String(iso).slice(0, 10).split("-").map(Number);
  if (Number.isNaN(y)) return "—";
  return new Date(y, mo - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ManageCommunityActivitiesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/community-outreach/my-activities", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Could not load activities.");
        if (!c) setRows(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if (!c) setError((e as Error)?.message || "Failed to load.");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  async function deleteActivity(id: string, title: string) {
    if (!confirm(`Delete “${title}”? Volunteers who signed up will be notified by email.`)) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/community-outreach/activities/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed.");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      setError((e as Error)?.message || "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-10 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manage Activity</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Edit or remove listings you posted to Find Community Activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/community-outreach/post-activity"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Post new activity
            </Link>
            <Link
              href="/community-outreach/view-signups"
              className="rounded-full border border-zinc-400 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
            >
              View Sign Ups
            </Link>
            <Link href="/community-outreach" className="rounded-full px-4 py-2 text-sm font-semibold text-blue-700 underline">
              Back to steps
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}

        <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-100">
                <th className="px-3 py-3 font-semibold">Title</th>
                <th className="px-3 py-3 font-semibold">Category</th>
                <th className="px-3 py-3 font-semibold">When</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold text-right">Sign-ups</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-600">
                    No activities yet.{" "}
                    <Link href="/community-outreach/post-activity" className="font-semibold text-blue-700 underline">
                      Post a service activity
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const when =
                    [formatDate(r.startDate), r.startTime, r.endTime ? `– ${r.endTime}` : ""]
                      .filter(Boolean)
                      .join(" · ") || "—";
                  return (
                    <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50/80">
                      <td className="px-3 py-3 font-medium">{r.title}</td>
                      <td className="px-3 py-3 text-zinc-700">{r.category}</td>
                      <td className="px-3 py-3 text-zinc-700">{when}</td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            r.status === "PUBLISHED" && r.isActive
                              ? "rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900"
                              : "rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800"
                          }
                        >
                          {r.status}
                          {!r.isActive ? " (inactive)" : ""}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{r._count.signups}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/community-outreach/manage-activities/${r.id}`}
                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/community-outreach/view-signups?activityId=${encodeURIComponent(r.id)}`}
                            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                          >
                            Sign-ups
                          </Link>
                          <button
                            type="button"
                            disabled={deletingId === r.id}
                            onClick={() => deleteActivity(r.id, r.title)}
                            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === r.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
