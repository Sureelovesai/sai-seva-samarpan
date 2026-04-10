"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  signupsEnabled: boolean;
  _count?: { signups: number };
};

export default function ManageEventsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/portal-events", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError((e as Error)?.message || "Could not load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? All sign-ups for this event will be removed.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/portal-events/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e: unknown) {
      setError((e as Error)?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white py-8">
      <div className="mx-auto max-w-5xl px-4">
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Public Events menu</strong> only lists events with status <strong>Published</strong>. Draft events are
          stored but stay hidden until you edit and publish them.
        </p>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-zinc-900">Manage Events</h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/add-event"
              className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
            >
              Add Event
            </Link>
            <Link
              href="/admin/events-dashboard"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {loading ? <p className="text-zinc-600">Loading…</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!loading && rows.length === 0 ? (
          <p className="text-zinc-600">No events yet. Create one from Add Event.</p>
        ) : null}

        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900">{r.title}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(r.startsAt).toLocaleString()} ·{" "}
                  <span className="font-medium">{r.status}</span>
                  {r.signupsEnabled ? " · Sign-ups on" : " · Sign-ups off"}
                  {typeof r._count?.signups === "number" ? ` · ${r._count.signups} responses` : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/manage-events/${r.id}`}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Edit
                </Link>
                <Link
                  href={`/admin/manage-events/${r.id}?mode=clone`}
                  className="rounded-lg border-2 border-indigo-600 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-800 shadow-sm hover:bg-indigo-50"
                >
                  Clone
                </Link>
                <Link
                  href={`/admin/event-signups?eventId=${encodeURIComponent(r.id)}`}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  Sign ups
                </Link>
                <button
                  type="button"
                  disabled={deletingId === r.id}
                  onClick={() => handleDelete(r.id, r.title)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
