"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type EventOpt = { id: string; title: string };
type SignupRow = {
  id: string;
  participantName: string;
  email: string;
  comment: string | null;
  accompanyingAdults: number;
  accompanyingKids: number;
  response: string;
  createdAt: string;
  event: { id: string; title: string; startsAt: string };
};

function EventSignupsInner() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("eventId") || "";

  const [events, setEvents] = useState<EventOpt[]>([]);
  const [eventId, setEventId] = useState(idFromUrl);
  const [response, setResponse] = useState("");
  const [rows, setRows] = useState<SignupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/portal-events", { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data)
          ? data.map((e: { id: string; title: string }) => ({ id: e.id, title: e.title }))
          : [];
        setEvents(list);
        if (list.length) {
          const fromUrl = searchParams.get("eventId");
          if (fromUrl && list.some((e: EventOpt) => e.id === fromUrl)) setEventId(fromUrl);
          else
            setEventId((prev) => (prev && list.some((e: EventOpt) => e.id === prev) ? prev : list[0].id));
        }
      } catch {
        if (!cancelled) setError("Could not load events");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const loadSignups = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventId) params.set("eventId", eventId);
      if (response) params.set("response", response);
      const res = await fetch(`/api/admin/event-signups?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError((e as Error)?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, [eventId, response]);

  useEffect(() => {
    if (eventId) void loadSignups();
  }, [eventId, response, loadSignups]);

  async function removeSignup(id: string) {
    if (!confirm("Remove this sign-up row?")) return;
    try {
      const res = await fetch(`/api/admin/event-signups/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e: unknown) {
      setError((e as Error)?.message || "Delete failed");
    }
  }

  function downloadCsv() {
    const header = ["Event", "Starts", "Name", "Email", "Comment", "Response", "GuestAdults", "GuestKids", "Submitted"];
    const lines = rows.map((r) =>
      [
        r.event.title,
        new Date(r.event.startsAt).toISOString(),
        r.participantName,
        r.email,
        r.comment ?? "",
        r.response,
        String(r.accompanyingAdults),
        String(r.accompanyingKids),
        new Date(r.createdAt).toISOString(),
      ]
        .map((c) => {
          const s = String(c ?? "");
          if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "event-signups.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-zinc-900">Event Sign Ups</h1>
          <Link
            href="/admin/events-dashboard"
            className="text-sm font-semibold text-emerald-900 underline hover:no-underline"
          >
            ← Event Admin Dashboard
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-zinc-600">Event</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="mt-1 min-w-[220px] rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              {events.length === 0 ? (
                <option value="">No events yet</option>
              ) : (
                events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600">Response</label>
            <select
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
              <option value="MAYBE">Maybe</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => void loadSignups()}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!rows.length}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-40"
          >
            Download CSV
          </button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {loading ? <p className="text-zinc-600">Loading…</p> : null}

        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold min-w-[8rem]">Comment</th>
                <th className="px-3 py-2 font-semibold">Response</th>
                <th className="px-3 py-2 font-semibold">Adults</th>
                <th className="px-3 py-2 font-semibold">Kids</th>
                <th className="px-3 py-2 font-semibold">Submitted</th>
                <th className="px-3 py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100">
                  <td className="px-3 py-2">{r.participantName}</td>
                  <td className="px-3 py-2">{r.email}</td>
                  <td className="max-w-xs px-3 py-2 text-sm text-zinc-700 whitespace-pre-wrap break-words">
                    {r.comment?.trim() ? r.comment : "—"}
                  </td>
                  <td className="px-3 py-2 font-medium">{r.response}</td>
                  <td className="px-3 py-2 tabular-nums">{r.accompanyingAdults}</td>
                  <td className="px-3 py-2 tabular-nums">{r.accompanyingKids}</td>
                  <td className="px-3 py-2 text-zinc-600">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeSignup(r.id)}
                      className="text-xs font-semibold text-red-700 underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 ? (
            <p className="p-6 text-center text-zinc-500">No sign-ups for this filter.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function EventSignupsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-600">Loading…</div>}>
      <EventSignupsInner />
    </Suspense>
  );
}
