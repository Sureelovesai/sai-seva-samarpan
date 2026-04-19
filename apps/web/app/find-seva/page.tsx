"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CENTERS_FOR_FILTER, CITIES, FIND_SEVA_LAST_CENTER_STORAGE_KEY } from "@/lib/cities";
import { SEVA_CATEGORIES_FOR_FILTER } from "@/lib/categories";
import { USA_REGIONS_FOR_FILTER, usaRegionFromUrlParams } from "@/lib/usaRegions";
import { SevaLevelTabInfoIcon, SEVA_LEVEL_TAB_INFO } from "@/app/_components/SevaLevelTabInfoIcon";
import { isActivityEnded } from "@/lib/activityEnded";
import {
  buildSevaActivitiesPageUrlFromFindSeva,
  isCompatibleMultiTabSelection,
  type FindSevaBrowseContext,
} from "@/lib/sevaActivitiesBrowseQuery";

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

/** Minutes since midnight for "HH:mm" / "H:mm"; null if missing or invalid */
function timeStringToMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm || !String(hhmm).trim()) return null;
  const [h, m] = String(hhmm).trim().split(":");
  const hour = parseInt(h, 10);
  const min = parseInt(m ?? "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(min)) return null;
  return hour * 60 + min;
}

/**
 * Find Seva list order: start calendar date → start time → end time (tiebreak) → title (A–Z).
 * Activities with no date sort after dated ones; missing times sort after known times on the same day.
 */
function compareFindSevaActivities(a: SevaActivity, b: SevaActivity): number {
  const ad = a.startDate ? String(a.startDate).slice(0, 10) : "";
  const bd = b.startDate ? String(b.startDate).slice(0, 10) : "";
  if (ad !== bd) {
    if (!ad && bd) return 1;
    if (ad && !bd) return -1;
    return ad.localeCompare(bd);
  }

  const am = timeStringToMinutes(a.startTime);
  const bm = timeStringToMinutes(b.startTime);
  if (am != null && bm != null && am !== bm) return am - bm;
  if (am != null && bm == null) return -1;
  if (am == null && bm != null) return 1;

  const ae = timeStringToMinutes(a.endTime);
  const be = timeStringToMinutes(b.endTime);
  if (ae != null && be != null && ae !== be) return ae - be;
  if (ae != null && be == null) return -1;
  if (ae == null && be != null) return 1;

  return (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
}

/** Category-based color for tiles */
function tileBg(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("online")) return "bg-sky-200/80";
  if (c.includes("food") || c.includes("narayana")) return "bg-green-200/80";
  if (c.includes("medicare") || c.includes("medical")) return "bg-blue-200/80";
  if (c.includes("sociocare") || c.includes("social")) return "bg-orange-200/80";
  if (c.includes("educare") || c.includes("educ")) return "bg-yellow-200/80";
  if (c.includes("environmental") || c.includes("go green")) return "bg-teal-200/80";
  if (c.includes("animal")) return "bg-amber-200/80";
  if (c.includes("senior") || c.includes("children") || c.includes("women")) return "bg-pink-200/80";
  if (c.includes("homeless") || c.includes("veterans")) return "bg-slate-200/80";
  if (c.includes("cultural") || c.includes("worship")) return "bg-purple-200/80";
  return "bg-purple-200/80";
}

function timeToAMPM(hhmm: string | null): string {
  if (!hhmm || !hhmm.trim()) return "";
  const [h, m] = hhmm.trim().split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return hhmm;
  const min = (m ?? "00").padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

/** Format ISO date to short local date string, or "" if invalid/missing */
function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "";
  const dateOnly = String(iso).slice(0, 10);
  const [y, mo, day] = dateOnly.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(day)) return "";
  const d = new Date(y, mo - 1, day);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Multi-select on Find Seva: only activities without `hasContributionList` may be combined.
 * At most one supply-list activity can be selected (opened alone in tabs).
 */
function getFindSevaCheckboxState(
  item: SevaActivity,
  selectedIds: string[],
  byId: Map<string, SevaActivity>
): { disabled: boolean; title: string; subline: ReactNode | null } {
  const ended = isActivityEnded({
    startDate: item.startDate,
    endDate: item.endDate,
    startTime: item.startTime,
    endTime: item.endTime,
    durationHours: item.durationHours ?? null,
  });
  if (ended) {
    return { disabled: true, title: "This activity has ended", subline: null };
  }

  if (selectedIds.length === 0) {
    if (item.hasContributionList) {
      return {
        disabled: false,
        title: "Has items-to-bring list — select alone, or combine only activities without a supply list",
        subline: (
          <span className="mt-0.5 block text-xs font-normal text-amber-900/90">
            Has a supply list — select this activity alone, or combine only activities that do not have items to bring.
          </span>
        ),
      };
    }
    return { disabled: false, title: "Include in multi-tab Seva Details", subline: null };
  }

  const selectedActs = selectedIds.map((id) => byId.get(id)).filter(Boolean) as SevaActivity[];
  const anyContribSelected = selectedActs.some((a) => a.hasContributionList);

  if (anyContribSelected) {
    if (selectedIds.length === 1 && selectedIds[0] === item.id) {
      return {
        disabled: false,
        title: item.hasContributionList
          ? "Open Seva Details for this supply-list activity"
          : "Include in multi-tab Seva Details",
        subline: item.hasContributionList ? (
          <span className="mt-0.5 block text-xs font-normal text-amber-900/90">
            Register items on the Seva Details tab (one activity at a time).
          </span>
        ) : null,
      };
    }
    if (selectedIds.length === 1 && selectedActs[0]?.hasContributionList) {
      return {
        disabled: true,
        title: "Clear selection to combine other activities",
        subline: (
          <span className="mt-0.5 block text-xs font-normal text-amber-900/90">
            An activity with a supply list is already selected. Clear selection to combine activities without items to
            bring, or open this row with View Details alone.
          </span>
        ),
      };
    }
    return {
      disabled: true,
      title: "Only one activity with a supply list at a time — clear selection to pick another",
      subline: (
        <span className="mt-0.5 block text-xs font-normal text-amber-900/90">
          Another activity with a supply list is already selected. Clear selection to choose a different one.
        </span>
      ),
    };
  }

  if (item.hasContributionList) {
    return {
      disabled: true,
      title: "Cannot combine with activities that have no supply list — clear selection first",
      subline: (
        <span className="mt-0.5 block text-xs font-normal text-amber-900/90">
          You already selected activities without a supply list. Clear selection to open this one alone.
        </span>
      ),
    };
  }

  return { disabled: false, title: "Include in multi-tab Seva Details", subline: null };
}

function FindSevaActivityRow({
  item,
  levelTab,
  nestedUnderProgram = false,
  viewDetailsHref,
  selected,
  onToggleSelect,
  selectDisabled,
  selectSubline,
  selectTitle,
}: {
  item: SevaActivity;
  levelTab: LevelTab;
  /** When true, this row sits under a program heading — only the activity title is shown here, not the program name. */
  nestedUnderProgram?: boolean;
  /** Preserves Center / Regional / National scope and filters on Seva Details (includes `ids` when multiple selected on Find Seva). */
  viewDetailsHref: string;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  selectDisabled: boolean;
  selectSubline: ReactNode | null;
  selectTitle: string;
}) {
  const ended = isActivityEnded({
    startDate: item.startDate,
    endDate: item.endDate,
    startTime: item.startTime,
    endTime: item.endTime,
    durationHours: item.durationHours ?? null,
  });
  return (
    <div
      className={`mx-auto w-full min-w-0 overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.22)] ${nestedUnderProgram ? "ring-1 ring-indigo-900/10" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-300/50 bg-white/85 px-4 py-2.5">
        <input
          type="checkbox"
          id={`find-seva-pick-${item.id}`}
          checked={selected}
          disabled={selectDisabled}
          title={selectTitle}
          onChange={(e) => onToggleSelect(e.target.checked)}
          className="h-5 w-5 shrink-0 rounded border-zinc-400 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Select ${item.title} to open together on Seva Details`}
        />
        <label
          htmlFor={`find-seva-pick-${item.id}`}
          className={`min-w-0 flex-1 ${selectDisabled ? "cursor-not-allowed" : "cursor-pointer"} text-sm font-medium leading-snug ${ended ? "text-zinc-400" : "text-zinc-800"}`}
        >
          {ended ? "Activity ended — cannot select" : "Select for Seva Details (open multiple in tabs)"}
          {selectSubline}
        </label>
      </div>
      <div
        className={`grid w-full min-w-0 grid-cols-1 items-stretch md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] md:overflow-hidden`}
      >
      <div className="flex min-h-[140px] w-full items-center justify-center overflow-hidden bg-zinc-200 md:min-h-0 md:h-full md:w-[180px] md:shrink-0">
        <div className="relative aspect-[9/8] w-full max-w-[min(100%,280px)] overflow-hidden md:max-w-[180px]">
          {(() => {
            const src = item.imageUrl ?? "/swami-circle.jpeg";
            const isRelativeOrBlob = src.startsWith("/") || src.includes("blob.vercel-storage.com");
            if (isRelativeOrBlob) {
              return (
                <Image
                  src={src}
                  alt={item.title}
                  fill
                  className="object-contain object-center"
                  sizes="(max-width: 767px) 90vw, 180px"
                />
              );
            }
            return (
              <img
                src={src}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-contain object-center"
              />
            );
          })()}
        </div>
      </div>

      <div
        className={`${tileBg(item.category)} min-w-0 px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10`}
      >
        <div className="flex min-w-0 gap-3 sm:gap-5">
          <div className="min-w-0 flex-1">
            <div className="break-words text-2xl font-semibold tracking-wide text-zinc-900 sm:text-3xl">
              {item.title}
            </div>

            <div className="mt-3 break-words text-base font-semibold leading-snug text-zinc-800 sm:text-lg">
              {formatWhenWhere(item)}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 break-words text-sm font-semibold text-zinc-700">
              <span>{item.category}</span>
              {levelTab === "regional" && item.sevaUsaRegion && (
                <span className="rounded border border-indigo-400 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-900">
                  {item.sevaUsaRegion}
                </span>
              )}
              {levelTab === "national" && (
                <span className="rounded border border-amber-600 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-950">
                  National
                </span>
              )}
            </div>

            {item.organizationName && (
              <div className="mt-2 break-words text-base font-semibold text-indigo-900">
                {item.organizationName}
              </div>
            )}

            <div className="mt-6 md:mt-8">
              <Link
                href={viewDetailsHref}
                className="block w-full bg-white px-6 py-3 text-center text-base font-medium text-zinc-800 shadow hover:bg-zinc-50 md:inline-block md:w-auto md:px-10 md:text-left"
              >
                View Details
              </Link>
            </div>
          </div>

          {item.capacity != null && item.capacity > 0 && item.spotsRemaining != null && (
            <div
              className="flex w-[5.25rem] shrink-0 flex-col justify-center self-stretch sm:w-28"
              aria-label={
                item.spotsRemaining === 0
                  ? "No volunteer spots left"
                  : `${item.spotsRemaining} volunteer spots left out of ${item.capacity}`
              }
            >
              <span
                className={`inline-flex w-full items-center justify-center rounded-full px-2.5 py-1.5 text-center text-sm font-bold tabular-nums leading-tight shadow-sm sm:px-3 sm:text-base ${
                  item.spotsRemaining === 0
                    ? "bg-zinc-200 text-zinc-700"
                    : "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400/50"
                }`}
              >
                {item.spotsRemaining === 0 ? "Full" : `${item.spotsRemaining} left`}
              </span>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function formatWhenWhere(a: SevaActivity) {
  const city = a.city || "";
  const startStr = formatDateOnly(a.startDate);
  const endStr = formatDateOnly(a.endDate);

  let dateStr = "";
  if (startStr && endStr) {
    dateStr =
      startStr === endStr
        ? startStr
        : `${startStr} – ${endStr}`;
  } else if (startStr) {
    dateStr = startStr;
  } else if (endStr) {
    dateStr = endStr;
  }

  const startAMPM = timeToAMPM(a.startTime);
  const endAMPM = timeToAMPM(a.endTime);
  const timeStr = [startAMPM, endAMPM].filter(Boolean).join(" – ");

  const parts = [dateStr, timeStr].filter(Boolean).join(", ");
  return [parts, city].filter(Boolean).join(" — ");
}

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

  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);

  const activityById = useMemo(() => new Map(filtered.map((a) => [a.id, a])), [filtered]);

  useEffect(() => {
    const allowed = new Set(filtered.map((a) => a.id));
    setSelectedActivityIds((prev) => {
      let next = prev.filter((id) => allowed.has(id));
      if (next.length > 1 && !isCompatibleMultiTabSelection(next, activityById)) {
        next = [next[0]];
      }
      return next;
    });
  }, [filtered, activityById]);

  const getRowCheckboxState = useCallback(
    (item: SevaActivity) => getFindSevaCheckboxState(item, selectedActivityIds, activityById),
    [selectedActivityIds, activityById]
  );

  const getSevaDetailsHref = useCallback(
    (rowActivityId: string) => {
      const merged = [...new Set([...selectedActivityIds, rowActivityId])];
      const multiOk = merged.length > 1 && isCompatibleMultiTabSelection(merged, activityById);
      return buildSevaActivitiesPageUrlFromFindSeva(rowActivityId, browseCtx, {
        selectedIds: multiOk ? merged : undefined,
      });
    },
    [browseCtx, selectedActivityIds, activityById]
  );

  const toggleActivitySelect = useCallback((id: string, checked: boolean) => {
    setSelectedActivityIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  }, []);

  const openSevaDetailsHref = useMemo(() => {
    if (selectedActivityIds.length === 0) return "#";
    const first = selectedActivityIds[0];
    const multiOk =
      selectedActivityIds.length > 1 && isCompatibleMultiTabSelection(selectedActivityIds, activityById);
    return buildSevaActivitiesPageUrlFromFindSeva(first, browseCtx, {
      selectedIds: multiOk ? selectedActivityIds : undefined,
    });
  }, [selectedActivityIds, browseCtx, activityById]);

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

        {selectedActivityIds.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-indigo-400/70 bg-gradient-to-r from-indigo-50 to-white px-4 py-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-indigo-950">
              {selectedActivityIds.length} activit{selectedActivityIds.length === 1 ? "y" : "ies"} selected —{" "}
              {selectedActivityIds.length > 1
                ? "opening together on Seva Details (tabs) is only for activities without an items-to-bring list."
                : "open on Seva Details with your current filters."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={openSevaDetailsHref}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-800"
              >
                Open Seva Details
              </Link>
              <button
                type="button"
                onClick={() => setSelectedActivityIds([])}
                className="rounded-lg border border-zinc-400 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Clear selection
              </button>
            </div>
          </div>
        )}

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
                    : `${ge.items.length} seva activities in this program — each card is its own activity with its own details.`}
                </p>
              </header>
              <div className="space-y-6 border-l-[3px] border-indigo-400/55 pl-4 md:pl-6">
                {ge.items.map((item) => {
                  const st = getRowCheckboxState(item);
                  return (
                    <FindSevaActivityRow
                      key={item.id}
                      item={item}
                      levelTab={levelTab}
                      nestedUnderProgram
                      viewDetailsHref={getSevaDetailsHref(item.id)}
                      selected={selectedActivityIds.includes(item.id)}
                      onToggleSelect={(checked) => toggleActivitySelect(item.id, checked)}
                      selectDisabled={st.disabled}
                      selectSubline={st.subline}
                      selectTitle={st.title}
                    />
                  );
                })}
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
                {groupedForDisplay.ungrouped.map((item) => {
                  const st = getRowCheckboxState(item);
                  return (
                    <FindSevaActivityRow
                      key={item.id}
                      item={item}
                      levelTab={levelTab}
                      viewDetailsHref={getSevaDetailsHref(item.id)}
                      selected={selectedActivityIds.includes(item.id)}
                      onToggleSelect={(checked) => toggleActivitySelect(item.id, checked)}
                      selectDisabled={st.disabled}
                      selectSubline={st.subline}
                      selectTitle={st.title}
                    />
                  );
                })}
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