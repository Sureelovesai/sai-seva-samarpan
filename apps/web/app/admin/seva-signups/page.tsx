"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ActivityOption = { id: string; title: string; levelTag: string };

function levelTagFromActivity(a: {
  title: string;
  scope?: string;
  sevaUsaRegion?: string | null;
}): string {
  const s = a.scope;
  if (s === "NATIONAL") return "National";
  if (s === "REGIONAL") return a.sevaUsaRegion?.trim() ? `Regional · ${a.sevaUsaRegion.trim()}` : "Regional";
  return "Center";
}
type SignupItem = {
  id: string;
  volunteerName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  activity: { id: string; title: string };
};

type ItemContributionRow = {
  id: string;
  volunteerName: string;
  email: string;
  phone: string | null;
  quantity: number;
  itemId: string;
  itemName: string;
  itemCategory: string;
  neededLabel: string;
  maxQuantity: number;
  createdAt: string;
};

type ItemContributionSummary = {
  activityId: string;
  totalClaimRows: number;
  byItem: Array<{
    itemId: string;
    name: string;
    category: string;
    neededLabel: string;
    maxQuantity: number;
    filledQuantity: number;
  }>;
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
  const [itemContributions, setItemContributions] = useState<ItemContributionRow[]>([]);
  const [itemContributionSummary, setItemContributionSummary] = useState<ItemContributionSummary | null>(null);
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
        const res = await fetch("/api/admin/seva-activities", { cache: "no-store", credentials: "include" });
        if (!res.ok) throw new Error("Failed to load activities");
        const data = await res.json();
        if (!cancelled) {
          const list = data?.length
            ? data.map(
                (a: { id: string; title: string; scope?: string; sevaUsaRegion?: string | null }) => ({
                  id: a.id,
                  title: a.title,
                  levelTag: levelTagFromActivity(a),
                })
              )
            : [];
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
      const res = await fetch(`/api/admin/seva-signups?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load sign-ups");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSignups(data);
        setItemContributions([]);
        setItemContributionSummary(null);
      } else {
        setSignups(Array.isArray(data.signups) ? data.signups : []);
        setItemContributions(Array.isArray(data.itemContributions) ? data.itemContributions : []);
        setItemContributionSummary(
          data.itemContributionSummary && typeof data.itemContributionSummary === "object"
            ? data.itemContributionSummary
            : null
        );
      }
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
        credentials: "include",
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
    const activityTitle =
      activities.find((a) => a.id === activityId)?.title ?? (realSignups[0]?.activity?.title ?? "");
    if (realSignups.length === 0 && itemContributions.length === 0) {
      setLoadError("Nothing to export. Load sign-ups first (select an activity for item contributions).");
      return;
    }
    setLoadError(null);
    const headers = ["Type", "Seva Activity", "Name", "Email", "Phone", "Status / Item", "Qty", "Date"];
    const joinRows = realSignups.map((s) => {
      const dateStr = s.createdAt
        ? new Date(s.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : "";
      return [
        escapeCsvCell("Join Seva"),
        escapeCsvCell(s.activity?.title ?? ""),
        escapeCsvCell(s.volunteerName),
        escapeCsvCell(s.email),
        escapeCsvCell(s.phone ?? ""),
        escapeCsvCell(s.status),
        escapeCsvCell(""),
        escapeCsvCell(dateStr),
      ].join(",");
    });
    const itemRows = itemContributions.map((c) => {
      const dateStr = c.createdAt
        ? new Date(c.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : "";
      const itemLabel = c.neededLabel ? `${c.itemName} (${c.neededLabel})` : c.itemName;
      return [
        escapeCsvCell("Item contribution"),
        escapeCsvCell(activityTitle),
        escapeCsvCell(c.volunteerName),
        escapeCsvCell(c.email),
        escapeCsvCell(c.phone ?? ""),
        escapeCsvCell(itemLabel),
        escapeCsvCell(String(c.quantity)),
        escapeCsvCell(dateStr),
      ].join(",");
    });
    const rows = [...joinRows, ...itemRows];
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
          fetch(`/api/admin/seva-signups/${s.id}`, { method: "DELETE", credentials: "include" })
        )
      );
      const failed = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      );
      if (failed.length > 0) {
        setLoadError(`Bulk cancel: ${failed.length} sign-up(s) could not be deleted.`);
      }
      setSignups([]);
      // Item contribution claims are not bulk-cancelled here (Join Seva only)
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
                <option key={a.id} value={a.id}>
                  [{a.levelTag}] {a.title}
                </option>
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

        <div className="mt-10 grid min-w-0 grid-cols-1 gap-10 md:grid-cols-2">
          <div className="min-w-0">
            <div className="text-lg font-semibold">From Date</div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="admin-date-input mt-4 w-full max-w-full border border-zinc-700 bg-white px-4 py-4 text-base sm:max-w-[360px] sm:px-6 sm:text-lg"
            />
          </div>

          <div className="min-w-0">
            <div className="text-lg font-semibold">To Date</div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="admin-date-input mt-4 w-full max-w-full border border-zinc-700 bg-white px-4 py-4 text-base sm:max-w-[360px] sm:px-6 sm:text-lg"
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
            disabled={
              loading ||
              (signups.filter((s) => !s.id.startsWith("placeholder-")).length === 0 &&
                itemContributions.length === 0)
            }
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
        {(loadError ||
          (!loading && cards.length === 0 && itemContributions.length === 0 && activities.length > 0)) && (
          <div className="mt-10 text-center text-xl font-semibold text-emerald-700">
            {loadError ??
              'No Join Seva sign-ups for these filters. Click "Load Signups" to refresh, or add filters.'}
          </div>
        )}

        {!activityId && !loading && activities.length > 0 && (
          <p className="mt-6 text-center text-base text-indigo-900/80">
            Tip: Choose a <strong>specific activity</strong> (not &quot;All activities&quot;) to load{" "}
            <strong>item contribution</strong> sign-ups and a fill summary.
          </p>
        )}

        {itemContributionSummary && itemContributionSummary.byItem.length > 0 && (
          <section className="mt-12 rounded-xl border border-indigo-200 bg-white/90 p-6 shadow-md">
            <h2 className="text-xl font-bold text-indigo-900">Item contributions — summary</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Volunteers who signed up to bring supplies for this activity ({itemContributionSummary.totalClaimRows}{" "}
              claim{itemContributionSummary.totalClaimRows === 1 ? "" : "s"}).
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {itemContributionSummary.byItem.map((row) => {
                const pct =
                  row.maxQuantity > 0
                    ? Math.min(100, Math.round((row.filledQuantity / row.maxQuantity) * 100))
                    : 0;
                return (
                  <div
                    key={row.itemId}
                    className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3"
                  >
                    <div className="font-semibold text-indigo-900">{row.name}</div>
                    {row.category ? (
                      <div className="text-xs text-zinc-500">{row.category}</div>
                    ) : null}
                    {row.neededLabel ? (
                      <div className="mt-1 text-sm text-zinc-700">Needed: {row.neededLabel}</div>
                    ) : null}
                    <div className="mt-2 text-sm font-medium text-zinc-800">
                      Filled: {row.filledQuantity} / {row.maxQuantity}
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {itemContributions.length > 0 && (
          <section className="mt-10 rounded-xl border border-indigo-200 bg-white/90 p-6 shadow-md">
            <h2 className="text-xl font-bold text-indigo-900">Item contributions — volunteers</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-300 bg-zinc-100">
                    <th className="px-3 py-2 font-semibold">Item</th>
                    <th className="px-3 py-2 font-semibold">Qty</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Phone</th>
                    <th className="px-3 py-2 font-semibold">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {itemContributions.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-200">
                      <td className="px-3 py-2">
                        <span className="font-medium text-indigo-900">{c.itemName}</span>
                        {c.neededLabel ? (
                          <span className="text-zinc-600"> ({c.neededLabel})</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{c.quantity}</td>
                      <td className="px-3 py-2">{c.volunteerName}</td>
                      <td className="px-3 py-2">{c.email}</td>
                      <td className="px-3 py-2">{c.phone ?? "—"}</td>
                      <td className="px-3 py-2">
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <h2 className="mb-4 mt-14 text-xl font-bold text-white drop-shadow">Join Seva sign-ups</h2>

        <div className="mt-2 grid gap-8 md:grid-cols-3">
          {displayCards.map((c) => (
            <div key={c.id} className="rounded-lg border border-zinc-300 bg-zinc-200/90 px-6 py-8 shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
              <div className="space-y-6">
                <Field label="Seva Activity" value={c.activity?.title ?? "—"} />
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
