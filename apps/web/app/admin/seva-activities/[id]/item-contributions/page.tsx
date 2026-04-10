"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Claim = {
  id: string;
  quantity: number;
  volunteerName: string;
  email: string;
  phone: string | null;
  createdAt: string;
};

type ItemRow = {
  id: string;
  name: string;
  category: string;
  neededLabel: string;
  maxQuantity: number;
  claims: Claim[];
};

export default function ItemContributionsDashboardPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [listedAsCommunityOutreach, setListedAsCommunityOutreach] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  const publicActivityPath = listedAsCommunityOutreach
    ? `/community-activity-details?id=${encodeURIComponent(id)}`
    : `/seva-activities?id=${encodeURIComponent(id)}`;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setListedAsCommunityOutreach(false);
    try {
      const res = await fetch(`/api/admin/seva-activities/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to load");
      }
      const a = await res.json();
      setTitle(a.title ?? "");
      setCity(a.city ?? "");
      setStartDate(a.startDate ?? null);
      setListedAsCommunityOutreach(Boolean(a.listedAsCommunityOutreach));
      const rows = (a.contributionItems ?? []) as ItemRow[];
      setItems(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) {
      if (it.category?.trim()) s.add(it.category.trim());
    }
    return ["All", ...Array.from(s).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (catFilter !== "All" && (it.category || "").trim() !== catFilter) return false;
      if (!q) return true;
      const blob = `${it.name} ${it.category} ${it.neededLabel}`.toLowerCase();
      return blob.includes(q);
    });
  }, [items, search, catFilter]);

  const stats = useMemo(() => {
    let totalSlots = 0;
    let filled = 0;
    for (const it of items) {
      totalSlots += it.maxQuantity;
      for (const c of it.claims ?? []) filled += c.quantity;
    }
    const pending = 0;
    const progress = totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0;
    return { totalSlots, filled, pending, progress };
  }, [items]);

  if (!id) {
    return <p className="p-8 text-center text-red-700">Missing activity id.</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-200/80">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link href={`/admin/manage-seva/${id}`} className="text-sm font-semibold text-indigo-700 hover:underline">
            ← Back to edit activity
          </Link>
          <button
            type="button"
            onClick={() => load()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
          >
            Refresh
          </button>
        </div>

        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Seva signup</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Item contribution list</h1>
          <p className="mt-2 text-slate-600">
            Manage items volunteers bring and see who signed up. Updates when volunteers submit from the Seva Activities page.
          </p>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {loading ? (
              <p className="text-slate-600">Loading…</p>
            ) : error ? (
              <p className="text-red-700">{error}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{title || "Activity"}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {city}
                      {startDate && (
                        <>
                          {" · "}
                          {new Date(startDate).toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  <Link
                    href={publicActivityPath}
                    className="shrink-0 rounded-lg border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-50"
                  >
                    View public page
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <input
                    type="search"
                    placeholder="Search items…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={catFilter}
                    onChange={(e) => setCatFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c === "All" ? "All categories" : c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                        <th className="pb-3 pr-4">Item</th>
                        <th className="pb-3 pr-4">Needed</th>
                        <th className="pb-3 pr-4">Signed up</th>
                        <th className="pb-3">Volunteers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500">
                            {items.length === 0
                              ? "No contribution items yet. Add them in Edit Seva Activity."
                              : "No items match your filters."}
                          </td>
                        </tr>
                      ) : (
                        filtered.map((it) => {
                          const filled = (it.claims ?? []).reduce((s, c) => s + c.quantity, 0);
                          const pct = it.maxQuantity > 0 ? Math.min(100, (filled / it.maxQuantity) * 100) : 0;
                          const barColor =
                            pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-slate-300";
                          return (
                            <tr key={it.id} className="border-b border-slate-100 align-top">
                              <td className="py-4 pr-4">
                                <div className="flex items-start gap-2">
                                  <div className="mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/swami-circle.jpeg" alt="" className="h-full w-full object-cover" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900">{it.name}</div>
                                    {it.category ? (
                                      <span className="mt-0.5 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                        {it.category}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 pr-4 text-slate-700">
                                {it.neededLabel || `${it.maxQuantity} units`}
                              </td>
                              <td className="py-4 pr-4">
                                <div className="font-semibold text-slate-900">
                                  {filled} / {it.maxQuantity}
                                </div>
                                <div className="mt-1 h-2 w-full max-w-[120px] overflow-hidden rounded-full bg-slate-100">
                                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                                </div>
                              </td>
                              <td className="py-4 text-slate-700">
                                {(it.claims ?? []).length === 0 ? (
                                  <span className="text-slate-400">—</span>
                                ) : (
                                  <ul className="space-y-1 text-xs">
                                    {it.claims.map((c) => (
                                      <li key={c.id}>
                                        <span className="font-medium">{c.volunteerName}</span> · {c.quantity} unit
                                        {c.quantity !== 1 ? "s" : ""}
                                        <br />
                                        <span className="text-slate-500">{c.email}</span>
                                        {c.phone ? ` · ${c.phone}` : ""}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Quick stats</h3>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Total slots</dt>
                  <dd className="text-2xl font-bold text-slate-900">{stats.totalSlots}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Filled</dt>
                  <dd className="text-2xl font-bold text-emerald-700">{stats.filled}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Pending</dt>
                  <dd className="text-2xl font-bold text-amber-600">{stats.pending}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Progress</dt>
                  <dd className="text-2xl font-bold text-indigo-700">{stats.progress}%</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 p-5">
              <p className="text-sm font-semibold text-indigo-900">Public link</p>
              <p className="mt-2 break-all text-xs text-indigo-800">
                {typeof window !== "undefined"
                  ? `${window.location.origin}${publicActivityPath}`
                  : publicActivityPath}
              </p>
              <button
                type="button"
                className="mt-3 w-full rounded-lg bg-emerald-700 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                onClick={() => {
                  const url =
                    typeof window !== "undefined"
                      ? `${window.location.origin}${publicActivityPath}`
                      : "";
                  if (url) void navigator.clipboard.writeText(url);
                }}
              >
                Copy link
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
