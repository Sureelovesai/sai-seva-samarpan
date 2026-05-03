"use client";

import { useMemo, useState } from "react";
import { SEVA_CATEGORIES_FOR_FILTER } from "@/lib/categories";
import { CENTERS_FOR_FILTER } from "@/lib/cities";
import { USA_REGIONS_FOR_FILTER } from "@/lib/usaRegions";

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoIsoLocal(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  onSuccess: (reportId: string) => void;
  onCancel?: () => void;
  showCancel?: boolean;
};

export function GenerateBlogReportForm({ onSuccess, onCancel, showCancel }: Props) {
  const defaults = useMemo(
    () => ({ from: daysAgoIsoLocal(30), to: todayIsoLocal() }),
    []
  );
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [centerFilter, setCenterFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [sevaCategoryFilter, setSevaCategoryFilter] = useState("All");
  const [targetWordCount, setTargetWordCount] = useState(100);
  const [userInstructions, setUserInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/blog-reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          dateFrom,
          dateTo,
          centerFilter,
          regionFilter,
          sevaCategoryFilter,
          targetWordCount,
          userInstructions,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `Request failed (${res.status})`
        );
      }
      if (typeof data?.id !== "string") {
        throw new Error("Invalid response from server.");
      }
      onSuccess(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}
      <p className="text-sm text-zinc-600">
        Reports use <strong>approved</strong> posts whose <strong>seva / story date</strong> falls in the range
        (or, if missing, the post date). Center, region, and seva category narrow the set. Posts need{" "}
        <strong>center / city</strong> when using those filters.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-800">From date</label>
          <input
            type="date"
            required
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-800">To date</label>
          <input
            type="date"
            required
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-800">Center (optional)</label>
          <select
            value={centerFilter}
            onChange={(e) => {
              setCenterFilter(e.target.value);
              if (e.target.value !== "All") setRegionFilter("All");
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm"
          >
            {CENTERS_FOR_FILTER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-800">USA region (optional)</label>
          <select
            value={regionFilter}
            onChange={(e) => {
              setRegionFilter(e.target.value);
              if (e.target.value !== "All") setCenterFilter("All");
            }}
            disabled={centerFilter !== "All"}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm disabled:opacity-50"
          >
            {USA_REGIONS_FOR_FILTER.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-800">Seva category (optional)</label>
        <select
          value={sevaCategoryFilter}
          onChange={(e) => setSevaCategoryFilter(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm"
        >
          {SEVA_CATEGORIES_FOR_FILTER.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-800">Target length (words)</label>
        <input
          type="number"
          min={100}
          max={2000}
          step={50}
          value={targetWordCount}
          onChange={(e) => setTargetWordCount(Number(e.target.value))}
          className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-800">Instructions for the analysis (optional)</label>
        <textarea
          value={userInstructions}
          onChange={(e) => setUserInstructions(e.target.value)}
          rows={4}
          placeholder="E.g. Emphasize youth programs, quote Swami on service, executive summary first…"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm"
        />
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-900 disabled:opacity-60"
        >
          {submitting ? "Generating… (may take a minute)" : "Generate report"}
        </button>
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-zinc-400 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
