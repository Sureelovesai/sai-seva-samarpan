"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CENTERS_FOR_FILTER, CITIES, FIND_SEVA_LAST_CENTER_STORAGE_KEY } from "@/lib/cities";
import { SEVA_CATEGORIES_FOR_FILTER } from "@/lib/categories";
import { USA_REGIONS_FOR_FILTER, usaRegionFromUrlParams } from "@/lib/usaRegions";
import { FindSevaActivityRow } from "@/app/_components/FindSevaActivityRow";
import { SevaLevelTabInfoIcon, SEVA_LEVEL_TAB_INFO } from "@/app/_components/SevaLevelTabInfoIcon";
import { compareFindSevaActivities } from "@/lib/findSevaListSort";
import { buildSevaActivitiesPageUrlFromFindSeva, type FindSevaBrowseContext } from "@/lib/sevaActivitiesBrowseQuery";

function persistLastFindSevaCenter(center: string) {
  try {
    if (center && center !== "All" && (CITIES as readonly string[]).includes(center)) {
      localStorage.setItem(FIND_SEVA_LAST_CENTER_STORAGE_KEY, center);
    }
  } catch {
    /* private mode */
  }
}

type LevelTab = "center" | "regional" | "national";

type SevaActivity = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  city: string;
  scope?: string;
  sevaUsaRegion?: string | null;
  /** Present when activity belongs to a published program group */
  group?: { id: string; title: string } | null;
  organizationName: string | null;
  startDate: string | null; // ISO string
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationHours?: number | null;
  locationName: string | null;
  address: string | null;
  capacity: number | null;
  /** Seats left for APPROVED roster (adults + kids); null when no capacity set. */
  spotsRemaining?: number | null;
  /** True when coordinators added item/supply list — batch join on Seva Details is limited. */
  hasContributionList?: boolean;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  coordinatorPhone: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

/** --- Small “smart fuzzy” matcher (typo tolerant) --- */
function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// subsequence match: "podiatry" matches "podatry" style partials a bit
function isSubsequence(needle: string, hay: string) {
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j++) {
    if (hay[j] === needle[i]) i++;
  }
  return i === needle.length;
}

// simple edit-distance (bounded) for short tokens
function levenshtein(a: string, b: string, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      rowMin = Math.min(rowMin, dp[i][j]);
    }
    if (rowMin > max) return max + 1; // early exit
  }
  return dp[a.length][b.length];
}

function fuzzyMatch(query: string, text: string) {
  const q = normalize(query);
  if (!q) return true;

  const t = normalize(text);
  if (!t) return false;

  // exact substring → pass
  if (t.includes(q)) return true;

  const qTokens = q.split(" ").filter(Boolean);
  const tTokens = t.split(" ").filter(Boolean);

  // token-based fuzzy: each query token should match at least one text token
  return qTokens.every((qt) => {
    // quick: substring or subsequence in any token
    for (const tt of tTokens) {
      if (tt.includes(qt)) return true;
      if (qt.length >= 4 && isSubsequence(qt, tt)) return true;
      if (qt.length >= 4 && tt.length >= 4 && levenshtein(qt, tt, 2) <= 2) return true;
    }
    return false;
  });
}

/** Multi-activity / batch join: use “Which activities are you joining?” on Seva Details, not on Find Seva. */

function initialFromDate(sp: ReturnType<typeof useSearchParams>) {
  const f = sp.get("fromDate");
  if (f && /^\d{4}-\d{2}-\d{2}$/.test(f)) return f;
  const legacy = sp.get("date");
  if (legacy && /^\d{4}-\d{2}-\d{2}$/.test(legacy)) return legacy;
  return "";
}

function initialToDate(sp: ReturnType<typeof useSearchParams>) {
  const t = sp.get("toDate");
  if (t && /^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const legacy = sp.get("date");
  if (legacy && /^\d{4}-\d{2}-\d{2}$/.test(legacy)) return legacy;
  return "";
}

function initialUsaRegion(sp: ReturnType<typeof useSearchParams>) {
  return usaRegionFromUrlParams((k) => sp.get(k)) ?? "All";
}

function initialLevelTab(sp: ReturnType<typeof useSearchParams>): LevelTab {
  const raw = (sp.get("level") || "").toLowerCase();
  if (raw === "regional") return "regional";
  if (raw === "national") return "national";
  return "center";
}

/**
 * Serialize tab + server-backed filters to the query string.
 * Omits `level` when Center (default) so URLs stay short; Regional/National always set `level`.
 */
function buildFindSevaUrlQuery(state: {
  levelTab: LevelTab;
  category: string;
  center: string;
  usaRegion: string;
  fromDate: string;
  toDate: string;
}): string {
  const p = new URLSearchParams();
  if (state.levelTab !== "center") {
    p.set("level", state.levelTab);
  }
  if (state.category && state.category !== "All") {
    p.set("category", state.category);
  }
  if (state.center && state.center !== "All") {
    p.set("city", state.center);
  }
  if (state.usaRegion && state.usaRegion !== "All") {
    p.set("usaRegion", state.usaRegion);
  }
  const dk = /^\d{4}-\d{2}-\d{2}$/;
  if (state.fromDate && dk.test(state.fromDate)) {
    p.set("fromDate", state.fromDate);
  }
  if (state.toDate && dk.test(state.toDate)) {
    p.set("toDate", state.toDate);
  }
  return p.toString();
}

/** Remount when query string changes so state matches deep links (e.g. admin calendar). */
function FindSevaKeyed() {
  const searchParams = useSearchParams();
  return <FindSevaContent key={searchParams.toString()} />;
}

function FindSevaContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const [category, setCategory] = useState(() => sp.get("category") || "All");
  const [center, setCenter] = useState(() => sp.get("city") || "All");
  const [usaRegion, setUsaRegion] = useState(() => initialUsaRegion(sp));
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState(() => initialFromDate(sp));
  const [toDate, setToDate] = useState(() => initialToDate(sp));
  const [levelTab, setLevelTab] = useState<LevelTab>(() => initialLevelTab(sp));

  const [items, setItems] = useState<SevaActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  /**
   * `useSearchParams()` is often empty on the first client render, then updates after hydration.
   * Without this sync, deep links like `?usaRegion=Region%203` never reach filter state.
   */
  const urlSyncKey = sp.toString();
  useEffect(() => {
    const cat = sp.get("category") || "All";
    const city = sp.get("city") || "All";
    const region = initialUsaRegion(sp);
    setCategory(cat);
    setCenter(city);
    setUsaRegion(region);
    setFromDate(initialFromDate(sp));
    setToDate(initialToDate(sp));
    setLevelTab(initialLevelTab(sp));
  }, [urlSyncKey]);

  /** Keep the address bar in sync so browser Back from Seva Details restores the same tab (e.g. Regional). */
  useEffect(() => {
    const next = buildFindSevaUrlQuery({
      levelTab,
      category,
      center,
      usaRegion,
      fromDate,
      toDate,
    });
    const cur = sp.toString();
    if (next === cur) return;
    router.replace(next ? `/find-seva?${next}` : "/find-seva", { scroll: false });
  }, [levelTab, category, center, usaRegion, fromDate, toDate, router, sp]);

  useEffect(() => {
    const fromUrl = sp.get("city")?.trim();
    if (fromUrl && fromUrl !== "All" && (CITIES as readonly string[]).includes(fromUrl)) {
      persistLastFindSevaCenter(fromUrl);
    }
  }, [sp]);

  useEffect(() => {
    if (levelTab === "center" && center && center !== "All" && (CITIES as readonly string[]).includes(center)) {
      persistLastFindSevaCenter(center);
    }
  }, [center, levelTab]);

  // Fetch from DB whenever server-side filters change (search text is client-only fuzzy filter)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (category && category !== "All") {
          params.set("category", category);
        }
        if (levelTab === "center") {
          if (center && center !== "All") {
            params.set("city", center);
          }
          if (usaRegion && usaRegion !== "All") {
            params.set("usaRegion", usaRegion);
          }
          params.set("sevaScope", "CENTER");
        } else if (levelTab === "regional") {
          if (usaRegion && usaRegion !== "All") {
            params.set("usaRegion", usaRegion);
          }
          params.set("sevaScope", "REGIONAL");
        } else {
          params.set("sevaScope", "NATIONAL");
        }
        const dk = /^\d{4}-\d{2}-\d{2}$/;
        const fOk = fromDate && dk.test(fromDate);
        const tOk = toDate && dk.test(toDate);
        if (fOk && tOk) {
          params.set("fromDate", fromDate);
          params.set("toDate", toDate);
        } else if (fOk && !toDate) {
          params.set("fromDate", fromDate);
          params.set("toDate", fromDate);
        } else if (tOk && !fromDate) {
          params.set("fromDate", toDate);
          params.set("toDate", toDate);
        }

        const res = await fetch(`/api/seva-activities?${params.toString()}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.detail || body?.error || `HTTP ${res.status}`);
        }

        const data = (await res.json()) as SevaActivity[];
        if (!cancelled) setItems(data || []);
      } catch (e: unknown) {
        if (!cancelled) {
          setItems([]);
          setError(e instanceof Error ? e.message : "Failed to load activities");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [category, center, usaRegion, fromDate, toDate, levelTab]);

  // Fuzzy search is applied client-side to whatever came from DB
  const filtered = useMemo(() => {
    const query = q.trim();
    if (!query) return items;

    return items.filter((a) => {
      const blob = [
        a.title,
        a.category,
        a.description || "",
        a.city,
        a.organizationName || "",
        a.locationName || "",
        a.address || "",
        a.group?.title || "",
      ].join(" ");
      return fuzzyMatch(query, blob);
    });
  }, [items, q]);

  /** Merge activities into one program block per *title*, not per DB row id — coordinators may create multiple group rows with the same name (e.g. two "Retreat" groups). */
  const groupedForDisplay = useMemo(() => {
    const normalizeProgramKey = (title: string) =>
      title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    const byProgramTitle = new Map<string, { displayTitle: string; items: SevaActivity[] }>();
    const ungrouped: SevaActivity[] = [];
    const sortItems = (arr: SevaActivity[]) => [...arr].sort(compareFindSevaActivities);

    for (const a of filtered) {
      const g = a.group;
      if (g?.title) {
        const key = normalizeProgramKey(g.title);
        const displayTitle = g.title.trim();
        const ex = byProgramTitle.get(key);
        if (ex) {
          ex.items.push(a);
        } else {
          byProgramTitle.set(key, { displayTitle, items: [a] });
        }
      } else {
        ungrouped.push(a);
      }
    }
    const groupEntries = [...byProgramTitle.entries()]
      .map(([mergeKey, v]) => ({
        mergeKey,
        title: v.displayTitle,
        items: sortItems(v.items),
      }))
      .sort((a, b) => {
        const bySchedule = compareFindSevaActivities(a.items[0], b.items[0]);
        if (bySchedule !== 0) return bySchedule;
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      });
    return { groupEntries, ungrouped: sortItems(ungrouped) };
  }, [filtered]);

  const browseCtx: FindSevaBrowseContext = useMemo(
    () => ({ levelTab, center, usaRegion, fromDate, toDate, category }),
    [levelTab, center, usaRegion, fromDate, toDate, category]
  );

  const getSevaDetailsHref = useCallback(
    (rowActivityId: string) => buildSevaActivitiesPageUrlFromFindSeva(rowActivityId, browseCtx),
    [browseCtx]
  );

  return (
    <div className="min-h-screen pt-2 bg-[radial-gradient(circle_at_40%_20%,rgba(255,255,255,0.65),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(180,190,210,0.85),rgba(120,210,230,0.75),rgba(180,190,210,0.85))]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* LEVEL TABS */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <div className="inline-flex w-full max-w-3xl overflow-visible rounded-lg border-2 border-indigo-800/80 bg-white/90 shadow-md">
            {(
              [
                { id: "center" as const, label: "Center level", info: SEVA_LEVEL_TAB_INFO.center },
                { id: "regional" as const, label: "Regional level", info: SEVA_LEVEL_TAB_INFO.regional },
                { id: "national" as const, label: "National level", info: SEVA_LEVEL_TAB_INFO.national },
              ] as const
            ).map((tab, i) => {
              const active = levelTab === tab.id;
              return (
                <div
                  key={tab.id}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-0.5 py-2 pl-1 pr-0.5 sm:gap-1 sm:py-3 sm:pl-2 sm:pr-1 md:pl-3 md:pr-2 ${
                    i === 0 ? "rounded-l-[calc(0.5rem-2px)]" : ""
                  } ${i === 2 ? "rounded-r-[calc(0.5rem-2px)]" : ""} ${
                    i > 0 ? "border-l border-indigo-300" : ""
                  } ${active ? "bg-indigo-800 text-white" : "bg-white text-indigo-900 hover:bg-indigo-50"}`}
                >
                  <button
                    type="button"
                    onClick={() => setLevelTab(tab.id)}
                    className="min-w-0 flex-1 px-1 text-center text-sm font-semibold transition-colors sm:px-2 sm:text-base"
                  >
                    {tab.label}
                  </button>
                  <SevaLevelTabInfoIcon
                    text={tab.info}
                    variant={active ? "findSevaActive" : "findSevaInactive"}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Narrow portrait phones only — jump to list; hidden in landscape and on md+ */}
        <div className="mb-5 hidden max-md:portrait:flex flex-col items-center gap-1">
          <button
            type="button"
            className="inline-flex max-w-[min(100%,17rem)] items-center justify-center rounded-full border border-indigo-700 bg-indigo-800 px-4 py-2 text-center text-xs font-bold tracking-wide text-white shadow-sm transition hover:bg-indigo-900 active:scale-[0.98]"
            aria-controls="find-seva-results"
            onClick={() => {
              document.getElementById("find-seva-results")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            Jump to activities list ↓
          </button>
          <span className="max-w-[16rem] text-center text-[10px] leading-tight text-zinc-500">
            Or scroll down to set category, center, dates, then browse results.
          </span>
        </div>

        <p className="mb-6 text-center text-sm text-zinc-700">
          {levelTab === "center" && (
            <>
              Center-level seva is tied to a Sai center / city. This is the usual local Find Seva list.
            </>
          )}
          {levelTab === "regional" && (
            <>
              Activities posted by <strong>Regional Seva Coordinators</strong> for a USA region. Use{" "}
              <strong>USA Region</strong> below to narrow to your area.
            </>
          )}
          {levelTab === "national" && (
            <>
              Activities posted by <strong>National Seva Coordinators</strong> for the whole organization.
            </>
          )}
        </p>
        <p className="mb-6 text-center text-xs text-zinc-600">
          Category, center, region, and dates update the list as soon as you change them.
        </p>

        {/* FILTERS */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:items-end">
          <div>
            <label className="block text-sm font-semibold text-zinc-800">
              Find Seva (Service Category)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full rounded-none border border-zinc-600 bg-white px-4 py-3 text-zinc-900 outline-none"
            >
              {SEVA_CATEGORIES_FOR_FILTER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {levelTab === "center" && (
            <div>
              <label className="block text-sm font-semibold text-zinc-800">
                Sri Sathya Sai Center/ Group
              </label>
              <select
                value={center}
                onChange={(e) => setCenter(e.target.value)}
                className="mt-2 w-full rounded-none border-b-2 border-b-indigo-600 border-transparent bg-white px-4 py-3 text-zinc-900 outline-none"
              >
                {CENTERS_FOR_FILTER.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(levelTab === "center" || levelTab === "regional") && (
            <div>
              <label className="block text-sm font-semibold text-zinc-800">
                USA Region
              </label>
              <select
                value={usaRegion}
                onChange={(e) => setUsaRegion(e.target.value)}
                className="mt-2 w-full rounded-none border border-zinc-600 bg-white px-4 py-3 text-zinc-900 outline-none"
              >
                {USA_REGIONS_FOR_FILTER.map((r) => (
                  <option key={r} value={r}>
                    {r === "All" ? "All regions" : r}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-zinc-800">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-2 w-full rounded-none border border-zinc-600 bg-white px-4 py-3 text-zinc-900 outline-none"
            />
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-4 sm:col-span-2 sm:gap-6 md:items-end">
            <div className="min-w-0">
              <label className="block text-sm font-semibold text-zinc-800">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-2 w-full rounded-none border border-zinc-600 bg-white px-4 py-3 text-zinc-900 outline-none"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-semibold text-zinc-800">
                Search
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter titles & descriptions below…"
                className="mt-2 w-full rounded-none border border-zinc-600 bg-white px-4 py-3 text-zinc-900 outline-none"
              />
            </div>
          </div>
        </div>

        {/* STATUS LINE */}
        <div className="mt-6 space-y-1 text-center text-sm font-semibold text-zinc-800">
          {levelTab === "center" && usaRegion !== "All" && (
            <p className="text-indigo-800">
              Filtered by region: <span className="font-semibold">{usaRegion}</span>
              {center !== "All" ? (
                <>
                  {" "}
                  and center <span className="font-semibold">{center}</span>
                </>
              ) : null}
              .
            </p>
          )}
          {levelTab === "regional" && usaRegion !== "All" && (
            <p className="text-indigo-800">
              Regional activities for{" "}
              <span className="font-semibold">{usaRegion}</span>.
            </p>
          )}
          {levelTab === "regional" && usaRegion === "All" && (
            <p className="text-indigo-800">Showing regional activities for all USA regions (use filters to narrow).</p>
          )}
          {fromDate && toDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate) && /^\d{4}-\d{2}-\d{2}$/.test(toDate) && (
            <p className="text-indigo-800">
              Showing activities scheduled on at least one day from{" "}
              <span className="whitespace-nowrap">{fromDate}</span> through{" "}
              <span className="whitespace-nowrap">{toDate}</span> (inclusive).
            </p>
          )}
          {fromDate && !toDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate) && (
            <p className="text-indigo-800">
              Showing activities that include <span className="whitespace-nowrap">{fromDate}</span>.
            </p>
          )}
          {!fromDate && toDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate) && (
            <p className="text-indigo-800">
              Showing activities that include <span className="whitespace-nowrap">{toDate}</span>.
            </p>
          )}
          {loading && "Loading activities..."}
          {!loading && error && <span className="text-red-700">{error}</span>}
        </div>

        {/* RESULTS — program name (e.g. Retreat) appears once; activities below are the individual sevas in that program */}
        <div
          id="find-seva-results"
          className="mt-8 space-y-10 scroll-mt-6 md:scroll-mt-4"
        >
          {groupedForDisplay.groupEntries.map((ge) => (
            <section
              key={ge.mergeKey}
              className="rounded-2xl border border-indigo-300/50 bg-white/35 p-4 shadow-[0_8px_28px_rgba(30,50,120,0.08)] backdrop-blur-sm md:p-7"
              aria-labelledby={`find-seva-program-${ge.mergeKey.replace(/\s+/g, "-")}`}
            >
              <header className="mb-5 border-b border-indigo-200/70 pb-4 text-center md:text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700/90">Program</p>
                <h2
                  id={`find-seva-program-${ge.mergeKey.replace(/\s+/g, "-")}`}
                  className="mt-1 text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl"
                >
                  {ge.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-700">
                  {ge.items.length === 1
                    ? "One seva activity in this program (details and sign-up are on the card below)."
                    : levelTab === "regional" || levelTab === "national"
                      ? `${ge.items.length} seva activities in this program. Use View Details on each card; you can open several in tabs and choose which to join on the Seva Details page.`
                      : `${ge.items.length} seva activities in this program — each card is its own activity with its own details.`}
                </p>
              </header>
              <div className="space-y-6 border-l-[3px] border-indigo-400/55 pl-4 md:pl-6">
                {ge.items.map((item) => (
                  <FindSevaActivityRow
                    key={item.id}
                    item={item}
                    levelTab={levelTab}
                    nestedUnderProgram
                    showSelectCheckbox={false}
                    viewDetailsHref={getSevaDetailsHref(item.id)}
                    selected={false}
                    onToggleSelect={() => {}}
                    selectDisabled
                    selectSubline={null}
                    selectTitle=""
                  />
                ))}
              </div>
            </section>
          ))}

          {groupedForDisplay.ungrouped.length > 0 && (
            <div
              className={
                groupedForDisplay.groupEntries.length > 0
                  ? "space-y-4 border-t border-indigo-200/50 pt-10"
                  : "space-y-4"
              }
            >
              {groupedForDisplay.groupEntries.length > 0 && (
                <h2 className="border-b border-zinc-300/60 pb-2 text-center text-lg font-bold text-zinc-800 md:text-left">
                  Other activities
                </h2>
              )}
              <div className="space-y-6">
                {groupedForDisplay.ungrouped.map((item) => (
                  <FindSevaActivityRow
                    key={item.id}
                    item={item}
                    levelTab={levelTab}
                    showSelectCheckbox={false}
                    viewDetailsHref={getSevaDetailsHref(item.id)}
                    selected={false}
                    onToggleSelect={() => {}}
                    selectDisabled
                    selectSubline={null}
                    selectTitle=""
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="rounded-lg bg-white/70 p-6 text-center text-zinc-800">
              {levelTab === "center" && "No center-level seva activities match your filters."}
              {levelTab === "regional" &&
                "No regional-level activities match your filters. Regional coordinators post these under Add Seva Activity → Regional."}
              {levelTab === "national" &&
                "No national-level activities match your filters. National coordinators post these under Add Seva Activity → National."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FindSevaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-[radial-gradient(circle_at_40%_20%,rgba(255,255,255,0.65),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(180,190,210,0.85),rgba(120,210,230,0.75),rgba(180,190,210,0.85))] text-lg font-semibold text-zinc-700">
          Loading Find Seva…
        </div>
      }
    >
      <FindSevaKeyed />
    </Suspense>
  );
}