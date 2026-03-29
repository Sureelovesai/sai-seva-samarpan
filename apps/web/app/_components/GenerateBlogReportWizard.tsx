"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SEVA_CATEGORIES_FOR_FILTER } from "@/lib/categories";
import { CENTERS_FOR_FILTER } from "@/lib/cities";
import { USA_REGIONS_FOR_FILTER } from "@/lib/usaRegions";

type PostRow = {
  id: string;
  title: string;
  section: string;
  authorName: string | null;
  createdAt: string;
  centerCity?: string | null;
  sevaCategory?: string | null;
  sevaDate?: string | null;
};

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
};

const MAX_SELECT = 60;

export function GenerateBlogReportWizard({ onSuccess }: Props) {
  const filterDefaults = useMemo(() => ({ from: daysAgoIsoLocal(30), to: todayIsoLocal() }), []);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState(filterDefaults.from);
  const [dateTo, setDateTo] = useState(filterDefaults.to);
  const [centerFilter, setCenterFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [sevaCategoryFilter, setSevaCategoryFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [userInstructions, setUserInstructions] = useState("");
  const [targetWordCount, setTargetWordCount] = useState(500);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Step 3: server reports whether OPENAI_API_KEY is set */
  const [openaiStatus, setOpenaiStatus] = useState<"idle" | "checking" | "yes" | "no" | "unknown">("idle");

  const blogPostsQuery = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("dateFrom", dateFrom);
    sp.set("dateTo", dateTo);
    if (centerFilter !== "All") sp.set("center", centerFilter);
    if (regionFilter !== "All") sp.set("region", regionFilter);
    if (sevaCategoryFilter !== "All") sp.set("sevaCategory", sevaCategoryFilter);
    return sp.toString();
  }, [dateFrom, dateTo, centerFilter, regionFilter, sevaCategoryFilter]);

  const loadPosts = useCallback(() => {
    setPostsLoading(true);
    setPostsError(null);
    return fetch(`/api/blog-posts?${blogPostsQuery}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${r.status}`);
        }
        return data;
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setPosts(
          list.map((p: PostRow) => ({
            id: p.id,
            title: p.title,
            section: p.section,
            authorName: p.authorName ?? null,
            createdAt: p.createdAt,
            centerCity: p.centerCity ?? null,
            sevaCategory: p.sevaCategory ?? null,
            sevaDate: p.sevaDate ?? null,
          }))
        );
        setPostsError(null);
      })
      .catch((e) => {
        setPostsError(e instanceof Error ? e.message : "Failed to load stories");
      })
      .finally(() => {
        setPostsLoading(false);
      });
  }, [blogPostsQuery]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    setSelected(new Set());
  }, [blogPostsQuery]);

  useEffect(() => {
    if (step !== 3) {
      setOpenaiStatus("idle");
      return;
    }
    let cancelled = false;
    setOpenaiStatus("checking");
    fetch("/api/blog-reports/ready", { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error("check failed");
        return data as { openaiConfigured?: boolean };
      })
      .then((d) => {
        if (cancelled) return;
        setOpenaiStatus(d.openaiConfigured ? "yes" : "no");
      })
      .catch(() => {
        if (!cancelled) setOpenaiStatus("unknown");
      });
    return () => {
      cancelled = true;
    };
  }, [step]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.section.toLowerCase().includes(q) ||
        (p.authorName && p.authorName.toLowerCase().includes(q))
    );
  }, [posts, query]);

  const selectedPostsInOrder = useMemo(() => {
    const map = new Map(posts.map((p) => [p.id, p]));
    return [...selected].map((id) => map.get(id)).filter((p): p is PostRow => !!p);
  }, [selected, posts]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= MAX_SELECT && !next.has(id)) return prev;
        next.add(id);
      }
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of filtered) {
        if (next.size >= MAX_SELECT) break;
        next.add(p.id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function formatShortDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso.slice(0, 10);
    }
  }

  /** Step 3 only — calls OpenAI-backed API, then redirects via onSuccess. */
  async function handleGenerateReport() {
    const postIds = [...selected];
    if (postIds.length === 0) return;
    setError(null);
    setSubmitting(true);
    const clampedWords = Math.min(2000, Math.max(200, Math.round(targetWordCount)));
    try {
      const res = await fetch("/api/blog-reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          postIds,
          userInstructions,
          targetWordCount: clampedWords,
          reportScope: {
            dateFrom,
            dateTo,
            centerFilter,
            regionFilter,
            sevaCategoryFilter,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : `Request failed (${res.status})`);
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

  if (postsError && posts.length === 0 && !postsLoading) {
    return <p className="text-sm text-red-700">{postsError}</p>;
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {step === 1 ? (
        <>
          <div>
            <p className="text-sm font-medium text-zinc-800">Step 1 of 3 — Choose stories</p>
            <p className="mt-1 text-sm text-zinc-600">
              Set filters so only matching stories appear, then select up to {MAX_SELECT}. Dates use each
              post&apos;s <strong>seva / story date</strong> when set, otherwise the posted date.{" "}
              <span className="font-semibold text-amber-950">{selected.size}</span> selected.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">
              Scope (blog list + report metadata)
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-700">From date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">To date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Center</label>
                <select
                  value={centerFilter}
                  onChange={(e) => {
                    setCenterFilter(e.target.value);
                    if (e.target.value !== "All") setRegionFilter("All");
                  }}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                >
                  {CENTERS_FOR_FILTER.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">USA region</label>
                <select
                  value={regionFilter}
                  onChange={(e) => {
                    setRegionFilter(e.target.value);
                    if (e.target.value !== "All") setCenterFilter("All");
                  }}
                  disabled={centerFilter !== "All"}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 disabled:opacity-50"
                >
                  {USA_REGIONS_FOR_FILTER.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700">Seva category</label>
                <select
                  value={sevaCategoryFilter}
                  onChange={(e) => setSevaCategoryFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                >
                  {SEVA_CATEGORIES_FOR_FILTER.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {postsLoading ? (
              <p className="mt-3 text-xs text-zinc-600">Updating story list…</p>
            ) : null}
            {postsError && posts.length > 0 ? (
              <p className="mt-2 text-xs text-amber-900">{postsError} (showing previous results if any)</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title, section, or author…"
              className="min-w-[12rem] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm"
              aria-label="Filter stories"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Select all in list
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Clear selection
              </button>
            </div>
          </div>

          <ul
            className="max-h-[min(400px,55vh)] divide-y divide-amber-100 overflow-y-auto rounded-xl border border-amber-200/80 bg-amber-50/30"
            aria-label="Stories to include"
          >
            {filtered.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer gap-3 px-4 py-3 hover:bg-white/80">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-400 text-amber-800 focus:ring-amber-700"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-zinc-900">{p.title}</span>
                    <span className="mt-0.5 block text-xs text-zinc-600">
                      {p.section}
                      {p.authorName ? ` · ${p.authorName}` : ""}
                      {p.sevaDate
                        ? ` · Seva date ${formatShortDate(p.sevaDate)}`
                        : ` · Posted ${formatShortDate(p.createdAt)}`}
                      {p.centerCity ? ` · ${p.centerCity}` : ""}
                      {p.sevaCategory ? ` · ${p.sevaCategory}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-600">
              {postsLoading
                ? "Loading…"
                : "No stories match these filters. Widen the date range or set center/region/category to All."}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => {
                setError(null);
                setStep(2);
              }}
              className="rounded-lg bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      ) : step === 2 ? (
        <>
          <div>
            <p className="text-sm font-medium text-zinc-800">Step 2 of 3 — Instructions</p>
            <p className="mt-1 text-sm text-zinc-600">
              Optional guidance for the AI ({selected.size} stor{selected.size === 1 ? "y" : "ies"} will be
              analyzed). Continue goes to a final review before anything is generated.
            </p>
          </div>

          <div>
            <label htmlFor="report-instructions" className="block text-sm font-medium text-zinc-800">
              Instructions for the analysis
            </label>
            <textarea
              id="report-instructions"
              value={userInstructions}
              onChange={(e) => setUserInstructions(e.target.value)}
              rows={5}
              placeholder="E.g. Focus on youth programs, keep tone devotional, highlight measurable impact…"
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm"
            />
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep(1);
              }}
              className="rounded-lg border border-zinc-400 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setOpenaiStatus("checking");
                setStep(3);
              }}
              className="rounded-lg bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-900"
            >
              Continue
            </button>
          </div>
        </>
      ) : (
        <div className="relative rounded-xl" aria-busy={submitting}>
          {submitting ? (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/85 px-6 py-10 text-center backdrop-blur-sm"
              role="status"
              aria-live="polite"
            >
              <span
                className="h-9 w-9 animate-spin rounded-full border-2 border-amber-800 border-t-transparent"
                aria-hidden
              />
              <p className="text-sm font-semibold text-zinc-900">Generating your report…</p>
              <p className="max-w-sm text-xs text-zinc-600">
                The AI is reading the selected stories. This often takes 30–90 seconds. Stay on this page;
                you will be redirected to the finished report when it is saved.
              </p>
            </div>
          ) : null}

          <div className={submitting ? "pointer-events-none select-none opacity-40" : ""}>
          <div>
            <p className="text-sm font-medium text-zinc-800">Step 3 of 3 — Review &amp; generate</p>
            <p className="mt-1 text-sm text-zinc-600">
              Confirm what will be sent to the AI. When you click <strong>Generate report</strong>, the server
              calls OpenAI, stores the report, then sends you to the report page.
            </p>
          </div>

          {openaiStatus === "checking" ? (
            <p className="text-xs text-zinc-500">Checking AI configuration…</p>
          ) : openaiStatus === "no" ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <strong>OpenAI is not configured.</strong> Set <code className="rounded bg-white px-1">OPENAI_API_KEY</code>{" "}
              on the server (e.g. Vercel env or <code className="rounded bg-white px-1">apps/web/.env.local</code>), then
              refresh this page.
            </p>
          ) : openaiStatus === "yes" ? (
            <p className="rounded-lg border border-green-200 bg-green-50/90 px-4 py-2 text-sm text-green-900">
              AI is configured — you can generate when ready.
            </p>
          ) : openaiStatus === "unknown" ? (
            <p className="text-xs text-zinc-500">
              Could not verify OpenAI configuration; you can still try — if it fails, check{" "}
              <code className="rounded bg-zinc-100 px-1">OPENAI_API_KEY</code>.
            </p>
          ) : null}

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 px-4 py-4 text-sm">
            <p className="font-medium text-zinc-900">
              {selected.size} stor{selected.size === 1 ? "y" : "ies"} in report order
            </p>
            <ul className="mt-2 max-h-40 list-inside list-decimal space-y-1 overflow-y-auto text-zinc-700">
              {selectedPostsInOrder.map((p) => (
                <li key={p.id} className="pl-1">
                  <span className="font-medium text-zinc-800">{p.title}</span>
                  <span className="text-zinc-500">
                    {" "}
                    ({p.section}
                    {p.authorName ? ` · ${p.authorName}` : ""})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Your instructions</p>
            <p className="mt-1 whitespace-pre-wrap text-zinc-800">
              {userInstructions.trim() ? userInstructions.trim() : "— None (the model will use its default style)."}
            </p>
          </div>

          <div>
            <label htmlFor="report-word-target" className="block text-sm font-medium text-zinc-800">
              Target length (words)
            </label>
            <input
              id="report-word-target"
              type="number"
              min={200}
              max={2000}
              step={50}
              value={targetWordCount}
              onChange={(e) => {
                const n = Number(e.target.value);
                setTargetWordCount(Number.isFinite(n) ? n : 500);
              }}
              disabled={submitting}
              className="mt-1 w-full max-w-[12rem] rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-zinc-500">Allowed range: 200–2000 (server will clamp if needed).</p>
          </div>

          <div className="flex flex-wrap justify-between gap-3 border-t border-amber-100 pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setError(null);
                setStep(2);
              }}
              className="rounded-lg border border-zinc-400 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={
                submitting ||
                selected.size === 0 ||
                openaiStatus === "idle" ||
                openaiStatus === "checking" ||
                openaiStatus === "no"
              }
              onClick={handleGenerateReport}
              className="rounded-lg bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Generating…" : "Generate report"}
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
