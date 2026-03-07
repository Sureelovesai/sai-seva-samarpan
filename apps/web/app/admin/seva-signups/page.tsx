"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ActivityOption = { id: string; title: string };
type SignupItem = {
  id: string;
  volunteerName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  activity: { id: string; title: string };
};

const PLACEHOLDER_CARDS_COUNT = 3;

const STATUSES = ["", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const STATUS_LABELS: Record<string, string> = { "": "All", PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected", CANCELLED: "Cancelled" };

function SevaSignUpsContent() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("activityId") || "";

  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [activityId, setActivityId] = useState(idFromUrl);
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [signups, setSignups] = useState<SignupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bulkCancelling, setBulkCancelling] = useState(false);

  useEffect(() => {
    if (idFromUrl) setActivityId(idFromUrl);
  }, [idFromUrl]);

  useEffect(() => {
    let cancelled = false;
    async function loadActivities() {
      try {
        const res = await fetch("/api/admin/seva-activities", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load activities");
        const data = await res.json();
        if (!cancelled) {
          const list = data?.length ? data.map((a: { id: string; title: string }) => ({ id: a.id, title: a.title })) : [];
          setActivities(list);
          if (list.length) {
            const fromUrl = searchParams.get("activityId");
            if (fromUrl && list.some((a: ActivityOption) => a.id === fromUrl))
              setActivityId(fromUrl);
            else
              setActivityId((prev) => (prev && list.some((a: ActivityOption) => a.id === prev) ? prev : list[0].id));
          }
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || "Could not load activities.");
      }
    }
    loadActivities();
    return () => { cancelled = true; };
  }, []);

  async function loadSignups() {
    setLoadError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activityId) params.set("activityId", activityId);
      if (status) params.set("status", status);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      const res = await fetch(`/api/admin/seva-signups?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load sign-ups");
      const data = await res.json();
      setSignups(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setLoadError((e as Error)?.message || "Could not load signups.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelSignup(signupId: string) {
    try {
      const res = await fetch(`/api/admin/seva-signups/${signupId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete sign-up");
      setSignups((prev) => prev.filter((s) => s.id !== signupId));
    } catch (e: unknown) {
      setLoadError((e as Error)?.message || "Could not delete sign-up.");
    }
  }

  function escapeCsvCell(value: string): string {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function exportCsv() {
    const realSignups = signups.filter((s) => !s.id.startsWith("placeholder-"));
    if (realSignups.length === 0) {
      setLoadError("No sign-ups to export. Load sign-ups first.");
      return;
    }
    setLoadError(null);
    const headers = ["Name", "Email", "Phone", "Status", "Date"];
    const rows = realSignups.map((s) => {
      const dateStr = s.createdAt
        ? new Date(s.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : "";
      return [
        escapeCsvCell(s.volunteerName),
        escapeCsvCell(s.email),
        escapeCsvCell(s.phone ?? ""),
        escapeCsvCell(s.status),
        escapeCsvCell(dateStr),
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seva-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function bulkCancel() {
    const realSignups = signups.filter((s) => !s.id.startsWith("placeholder-"));
    if (realSignups.length === 0) {
      setLoadError("No sign-ups to cancel. Load sign-ups first.");
      return;
    }
    setLoadError(null);
    setBulkCancelling(true);
    try {
      const results = await Promise.allSettled(
        realSignups.map((s) =>
          fetch(`/api/admin/seva-signups/${s.id}`, { method: "DELETE" })
        )
      );
      const failed = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      );
      if (failed.length > 0) {
        setLoadError(`Bulk cancel: ${failed.length} sign-up(s) could not be deleted.`);
      }
      setSignups([]);
    } catch (e: unknown) {
      setLoadError((e as Error)?.message || "Bulk cancel failed.");
    } finally {
      setBulkCancelling(false);
    }
  }

  const cards = useMemo(() => signups, [signups]);
  const displayCards = useMemo(() => {
    if (cards.length > 0) return cards;
    return Array.from({ length: PLACEHOLDER_CARDS_COUNT }, (_, i) => ({
      id: `placeholder-${i}`,
      volunteerName: "—",
      email: "—",
      phone: null as string | null,
      status: "—",
      createdAt: "",
      activity: { id: "", title: "—" },
    }));
  }, [cards]);
  const isPlaceholder = (id: string) => id.startsWith("placeholder-");

  return (
    <div className="min-h-screen bg-[linear-gradient(90deg,rgba(105,130,220,0.85),rgba(160,170,210,0.65),rgba(190,190,120,0.55))]">

      {/* HERO SECTION */}
      <section className="w-full border-t border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
        <div className="w-full bg-[linear-gradient(90deg,rgba(85,95,165,0.95),rgba(165,150,170,0.55),rgba(190,185,95,0.65))]">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-2 md:items-center">

            <div>
              <div className="text-4xl font-extrabold italic text-white md:text-5xl">
                View Sign Ups -
              </div>
              <div className="mt-3 text-2xl font-bold italic text-white">
                Select an Activity to see Volunteer Sign ups
              </div>

              <div className="mt-8">
                <div className="relative h-[210px] w-[320px] bg-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.25)]">
                  <Image
                    src="/signups-board.jpg"
                    alt="Sign Ups"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center md:justify-end">
            <div className="relative h-[380px] w-full max-w-[520px] bg-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.25)]">
              <Image
                src="/swami-signups.jpg"
                alt="Swami"
                fill
                className="object-contain"
                priority
              />
           </div>
           </div> 

          </div>
        </div>
      </section>

      {/* FILTER SECTION */}
      <div className="mx-auto max-w-6xl px-4 py-12">

        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="text-lg font-semibold">Seva Activity</div>
            <select
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="mt-4 w-full max-w-[360px] border border-zinc-700 bg-white px-6 py-4 text-lg"
            >
              <option value="">All activities</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-lg font-semibold">Signup Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-4 w-full max-w-[360px] border border-zinc-700 bg-white px-6 py-4 text-lg"
            >
              {STATUSES.map((s) => (
                <option key={s || "all"} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <div>
            <div className="text-lg font-semibold">From Date</div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-4 w-full max-w-[360px] border border-zinc-700 bg-white px-6 py-4 text-lg"
            />
          </div>

          <div>
            <div className="text-lg font-semibold">To Date</div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-4 w-full max-w-[360px] border border-zinc-700 bg-white px-6 py-4 text-lg"
            />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-10 md:flex-row md:justify-center">
          <button
            type="button"
            onClick={loadSignups}
            disabled={loading}
            className="bg-blue-500 px-14 py-4 text-lg font-semibold text-white shadow disabled:opacity-70"
          >
            {loading ? "Loading…" : "Load Signups"}
          </button>

          <button
            type="button"
            onClick={exportCsv}
            disabled={loading || signups.length === 0}
            className="rounded-full bg-emerald-800 px-16 py-4 text-lg font-semibold tracking-[0.35em] text-white shadow hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={bulkCancel}
            disabled={loading || bulkCancelling || signups.length === 0}
            className="bg-zinc-800 px-16 py-4 text-lg font-semibold text-white shadow hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkCancelling ? "Cancelling…" : "Bulk Cancel"}
          </button>
        </div>

        {/* Status message (green per design) */}
        {(loadError || (!loading && cards.length === 0 && activities.length > 0)) && (
          <div className="mt-10 text-center text-xl font-semibold text-emerald-700">
            {loadError ?? "No sign-ups found. Click \"Load Signups\" to load, or add filters."}
          </div>
        )}

        {/* Signup cards: always show 3 slots (real or placeholder) */}
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {displayCards.map((c) => (
            <div key={c.id} className="rounded-lg border border-zinc-300 bg-zinc-200/90 px-6 py-8 shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
              <div className="space-y-6">
                <Field label="Name" value={c.volunteerName} />
                <Field label="Email" value={c.email} />
                <Field label="Phone" value={c.phone ?? "—"} />
                <Field label="Status" value={c.status} />
                <Field label="Date" value={c.createdAt ? new Date(c.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"} />
              </div>

              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  disabled={isPlaceholder(c.id) || c.status === "CANCELLED"}
                  onClick={() => !isPlaceholder(c.id) && cancelSignup(c.id)}
                  className="bg-zinc-800 px-12 py-3 text-base font-semibold text-white shadow hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default function SevaSignUpsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><p>Loading…</p></div>}>
      <SevaSignUpsContent />
    </Suspense>
  );
}

function Field(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-semibold text-indigo-800">{props.label}</div>
      <div className="mt-1 text-lg font-semibold text-indigo-900">{props.value}</div>
    </div>
  );
}
