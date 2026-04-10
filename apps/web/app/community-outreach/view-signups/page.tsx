"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ActivityOption = { id: string; title: string };

type SignupRow = {
  id: string;
  volunteerName: string;
  email: string;
  phone: string | null;
  adultsCount: number;
  kidsCount: number;
  status: string;
  comment: string | null;
  createdAt: string;
  activity: { id: string; title: string; city: string; organizationName: string | null };
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

const STATUSES = ["", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const STATUS_LABELS: Record<string, string> = {
  "": "All",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function ViewSignUpsInner() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("activityId") || "";

  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [activityId, setActivityId] = useState(idFromUrl);
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [itemContributions, setItemContributions] = useState<ItemContributionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (idFromUrl) setActivityId(idFromUrl);
  }, [idFromUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/community-outreach/my-activities", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => []);
        if (!res.ok || cancelled) return;
        const list = Array.isArray(data)
          ? data.map((a: { id: string; title: string }) => ({ id: a.id, title: a.title }))
          : [];
        setActivities(list);
        if (list.length && idFromUrl && list.some((a) => a.id === idFromUrl)) {
          setActivityId(idFromUrl);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idFromUrl]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    if (checked) {
      for (const s of signups) {
        if (s.status !== "CANCELLED") next[s.id] = true;
      }
    }
    setSelected(next);
  }

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  }

  async function loadSignups() {
    setLoadError(null);
    setLoading(true);
    setSelected({});
    try {
      const params = new URLSearchParams();
      if (activityId) params.set("activityId", activityId);
      if (status) params.set("status", status);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      const res = await fetch(`/api/community-outreach/signups?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load sign-ups");
      setSignups(Array.isArray(data.signups) ? data.signups : []);
      setItemContributions(Array.isArray(data.itemContributions) ? data.itemContributions : []);
    } catch (e: unknown) {
      setLoadError((e as Error)?.message || "Could not load signups.");
      setSignups([]);
      setItemContributions([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) {
      setLoadError("Select at least one row to delete.");
      return;
    }
    if (!confirm(`Delete ${selectedIds.length} sign-up(s)? This cannot be undone.`)) return;
    setDeleting(true);
    setLoadError(null);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((sid) =>
          fetch(`/api/community-outreach/signups/${sid}`, {
            method: "DELETE",
            credentials: "include",
          })
        )
      );
      const failed = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      );
      if (failed.length > 0) {
        setLoadError(`${failed.length} sign-up(s) could not be deleted. Refresh and try again.`);
      }
      setSelected({});
      await loadSignups();
    } catch (e: unknown) {
      setLoadError((e as Error)?.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteOne(signupId: string) {
    if (!confirm("Delete this sign-up?")) return;
    setLoadError(null);
    try {
      const res = await fetch(`/api/community-outreach/signups/${signupId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Delete failed");
      }
      setSelected((prev) => {
        const n = { ...prev };
        delete n[signupId];
        return n;
      });
      setSignups((prev) => prev.filter((s) => s.id !== signupId));
    } catch (e: unknown) {
      setLoadError((e as Error)?.message || "Could not delete.");
    }
  }

  const selectableRows = signups.filter((s) => s.status !== "CANCELLED");
  const allSelectableSelected =
    selectableRows.length > 0 && selectableRows.every((s) => selected[s.id]);

  return (
    <div className="min-h-screen bg-zinc-50 py-10 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">View Sign Ups</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Join Seva registrations for your Community Outreach listings. Select rows to delete in bulk.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/community-outreach/manage-activities"
              className="rounded-full border border-zinc-400 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
            >
              Manage Activity
            </Link>
            <Link href="/community-outreach" className="rounded-full px-4 py-2 text-sm font-semibold text-blue-700 underline">
              Back to steps
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-sm font-semibold text-zinc-700">Activity</label>
            <select
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">All my activities</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s || "all"} value={s}>
                  {STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-700">From date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-700">To date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadSignups}
            disabled={loading}
            className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load sign-ups"}
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={loading || deleting || selectedIds.length === 0}
            className="rounded-full border border-red-400 bg-white px-6 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : `Delete selected (${selectedIds.length})`}
          </button>
        </div>

        {loadError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {loadError}
          </div>
        )}

        {!activityId && signups.length > 0 && (
          <p className="mt-4 text-sm text-amber-900">
            Tip: Choose a <strong>specific activity</strong> and load again to include <strong>item contribution</strong> rows below.
          </p>
        )}

        <section className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <h2 className="border-b border-zinc-200 bg-zinc-100 px-4 py-3 text-lg font-semibold text-zinc-900">
            Join Seva sign-ups
          </h2>
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="w-10 px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelectableSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                    disabled={signups.length === 0}
                  />
                </th>
                <th className="px-3 py-2 font-semibold">Activity</th>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Phone</th>
                <th className="px-3 py-2 font-semibold text-right">Adults</th>
                <th className="px-3 py-2 font-semibold text-right">Kids</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold min-w-[140px]">Comment</th>
                <th className="px-3 py-2 font-semibold">Signed up</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {signups.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-zinc-500">
                    No rows loaded. Choose filters and click &quot;Load sign-ups&quot;.
                  </td>
                </tr>
              ) : (
                signups.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-100 hover:bg-zinc-50/80">
                    <td className="px-2 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={!!selected[s.id]}
                        disabled={s.status === "CANCELLED"}
                        onChange={(e) => toggleRow(s.id, e.target.checked)}
                        aria-label={`Select ${s.volunteerName}`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-zinc-800">{s.activity?.title ?? "—"}</td>
                    <td className="px-3 py-2 align-top font-medium">{s.volunteerName}</td>
                    <td className="px-3 py-2 align-top">{s.email}</td>
                    <td className="px-3 py-2 align-top">{s.phone ?? "—"}</td>
                    <td className="px-3 py-2 align-top text-right tabular-nums">{s.adultsCount}</td>
                    <td className="px-3 py-2 align-top text-right tabular-nums">{s.kidsCount}</td>
                    <td className="px-3 py-2 align-top">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium">{s.status}</span>
                    </td>
                    <td className="px-3 py-2 align-top text-zinc-700 max-w-[220px] whitespace-pre-wrap break-words">
                      {s.comment ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap text-zinc-600">
                      {s.createdAt
                        ? new Date(s.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <button
                        type="button"
                        disabled={s.status === "CANCELLED"}
                        onClick={() => deleteOne(s.id)}
                        className="text-sm font-semibold text-red-700 hover:underline disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {itemContributions.length > 0 && (
          <section className="mt-10 overflow-x-auto rounded-xl border border-indigo-200 bg-white shadow-sm">
            <h2 className="border-b border-indigo-100 bg-indigo-50 px-4 py-3 text-lg font-semibold text-indigo-950">
              Item contributions (bring list)
            </h2>
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
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
                  <tr key={c.id} className="border-b border-zinc-100">
                    <td className="px-3 py-2">
                      <span className="font-medium text-indigo-900">{c.itemName}</span>
                      {c.neededLabel ? (
                        <span className="text-zinc-600"> ({c.neededLabel})</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{c.quantity}</td>
                    <td className="px-3 py-2">{c.volunteerName}</td>
                    <td className="px-3 py-2">{c.email}</td>
                    <td className="px-3 py-2">{c.phone ?? "—"}</td>
                    <td className="px-3 py-2 text-zinc-600">
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
          </section>
        )}
      </div>
    </div>
  );
}

export default function ViewCommunitySignUpsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center">Loading…</div>}>
      <ViewSignUpsInner />
    </Suspense>
  );
}
