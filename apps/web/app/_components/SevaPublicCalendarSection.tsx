"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CENTERS_FOR_FILTER } from "@/lib/cities";
import { USA_REGIONS_FOR_FILTER } from "@/lib/usaRegions";
import { SevaLevelTabInfoIcon, SEVA_LEVEL_TAB_INFO } from "@/app/_components/SevaLevelTabInfoIcon";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type LevelTab = "center" | "regional" | "national";

/**
 * Public Seva Activity Calendar (home page). Uses /api/seva-calendar — no login required.
 * Level tabs and filters mirror Find Seva.
 */
export function SevaPublicCalendarSection() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [levelTab, setLevelTab] = useState<LevelTab>("center");
  const [center, setCenter] = useState("All");
  const [usaRegion, setUsaRegion] = useState("All");

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("year", String(year));
      params.set("month", String(month));
      if (levelTab === "center") {
        params.set("sevaScope", "CENTER");
        if (center !== "All") params.set("center", center);
        if (usaRegion !== "All") params.set("usaRegion", usaRegion);
      } else if (levelTab === "regional") {
        params.set("sevaScope", "REGIONAL");
        if (usaRegion !== "All") params.set("usaRegion", usaRegion);
      } else {
        params.set("sevaScope", "NATIONAL");
      }
      const res = await fetch(`/api/seva-calendar?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { counts?: Record<string, number> };
      setCounts(data.counts ?? {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load calendar");
      setCounts({});
    } finally {
      setLoading(false);
    }
  }, [year, month, levelTab, center, usaRegion]);

  useEffect(() => {
    load();
  }, [load]);

  const { leadingBlanks, dayKeys } = useMemo(() => {
    const idx = month - 1;
    const first = new Date(year, idx, 1);
    const leading = first.getDay();
    const last = new Date(year, idx + 1, 0).getDate();
    const keys: string[] = [];
    const y = String(year);
    const m = String(month).padStart(2, "0");
    for (let d = 1; d <= last; d++) {
      keys.push(`${y}-${m}-${String(d).padStart(2, "0")}`);
    }
    return { leadingBlanks: leading, dayKeys: keys };
  }, [year, month]);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 7 }, (_, i) => y - 3 + i);
  }, [now]);

  const weekRows = Math.ceil((leadingBlanks + dayKeys.length) / 7);

  const buildFindSevaHref = (dateKey: string) => {
    const params = new URLSearchParams();
    if (levelTab === "center") {
      params.set("level", "center");
      if (center !== "All") params.set("city", center);
      if (usaRegion !== "All") params.set("usaRegion", usaRegion);
    } else if (levelTab === "regional") {
      params.set("level", "regional");
      if (usaRegion !== "All") params.set("usaRegion", usaRegion);
    } else {
      params.set("level", "national");
    }
    params.set("fromDate", dateKey);
    params.set("toDate", dateKey);
    return `/find-seva?${params.toString()}`;
  };

  return (
    <section className="mx-auto flex w-full max-w-[calc(64rem*0.95)] min-h-[min(100vh,920px)] flex-col px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex min-h-[min(88vh,840px)] flex-1 flex-col overflow-hidden rounded-xl border border-sky-800 bg-gradient-to-b from-sky-950 to-slate-900 shadow-lg">
        <div className="border-b border-sky-800/80 px-5 py-3 sm:px-6">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
            <span className="h-px w-full max-w-[60px] bg-gradient-to-r from-transparent to-sky-400/60 sm:block" aria-hidden />
            <h2 className="text-center text-xl font-extrabold tracking-[0.12em] text-sky-100 sm:text-2xl">
              Seva Activity Calendar
            </h2>
            <span className="h-px w-full max-w-[60px] bg-gradient-to-l from-transparent to-sky-400/60 sm:block" aria-hidden />
          </div>
        </div>

        <div className="border-b border-sky-800/80 px-4 py-3 sm:px-6">
          <div className="mb-3 flex flex-col items-stretch gap-2 sm:items-center">
            <div className="inline-flex w-full overflow-visible rounded-lg border-2 border-sky-600/80 bg-slate-900/80 shadow-md">
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
                    className={`flex min-w-0 flex-1 items-center justify-center gap-0.5 py-2 pl-1 pr-0.5 sm:gap-1 sm:py-2.5 sm:px-2 md:px-3 ${
                      i === 0 ? "rounded-l-[calc(0.5rem-2px)]" : ""
                    } ${i === 2 ? "rounded-r-[calc(0.5rem-2px)]" : ""} ${
                      i > 0 ? "border-l border-sky-700/80" : ""
                    } ${
                      active ? "bg-sky-600 text-white" : "bg-slate-900/90 text-sky-100 hover:bg-slate-800"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setLevelTab(tab.id)}
                      className="min-w-0 flex-1 px-1 text-center text-xs font-semibold transition-colors sm:px-2 sm:text-sm"
                    >
                      {tab.label}
                    </button>
                    <SevaLevelTabInfoIcon
                      text={tab.info}
                      variant={active ? "calendarActive" : "calendarInactive"}
                    />
                  </div>
                );
              })}
            </div>
            {(levelTab === "regional" || levelTab === "national") && (
              <p className="w-full text-center text-xs text-sky-200/90">
                {levelTab === "regional" && (
                  <>
                    Regional coordinators post by USA region — use <strong className="text-sky-50">USA Region</strong>{" "}
                    below.
                  </>
                )}
                {levelTab === "national" && (
                  <>National coordinators post organization-wide activities (no center or region filters).</>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            {levelTab === "center" && (
              <div className="min-w-[140px] flex-1 sm:flex-none">
                <label className="block text-xs font-semibold text-sky-200">Center</label>
                <select
                  value={center}
                  onChange={(e) => setCenter(e.target.value)}
                  className="mt-1 w-full rounded border border-sky-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-sky-400"
                >
                  {CENTERS_FOR_FILTER.map((c) => (
                    <option key={c} value={c}>
                      {c === "All" ? "All centers" : c}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(levelTab === "center" || levelTab === "regional") && (
              <div className="min-w-[160px] flex-1 sm:flex-none">
                <label className="block text-xs font-semibold text-sky-200">USA Region</label>
                <select
                  value={usaRegion}
                  onChange={(e) => setUsaRegion(e.target.value)}
                  className="mt-1 w-full rounded border border-sky-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-sky-400"
                >
                  {USA_REGIONS_FOR_FILTER.map((r) => (
                    <option key={r} value={r}>
                      {r === "All" ? "All regions" : r}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="min-w-[120px]">
              <label className="block text-xs font-semibold text-sky-200">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="mt-1 w-full rounded border border-sky-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-sky-400"
              >
                {MONTH_LABELS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[100px]">
              <label className="block text-xs font-semibold text-sky-200">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 w-full rounded border border-sky-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-sky-400"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-500 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 py-2 sm:px-6 sm:py-4">
          {error && <p className="mb-2 text-center text-sm text-red-300">{error}</p>}
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <div className="grid shrink-0 grid-cols-7 gap-1 text-center text-[10px] font-semibold leading-none text-sky-300 sm:text-[11px]">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1 sm:py-1.5">
                  {w}
                </div>
              ))}
            </div>
            <div
              className="mt-1 grid min-h-[min(52vh,560px)] flex-1 grid-cols-7 gap-1 sm:mt-2 sm:gap-1.5 sm:min-h-[min(58vh,640px)] lg:min-h-[min(62vh,720px)]"
              style={{ gridTemplateRows: `repeat(${weekRows}, minmax(3.25rem, 1fr))` }}
            >
              {Array.from({ length: leadingBlanks }, (_, i) => (
                <div key={`pad-${i}`} className="h-full min-h-[3.25rem] rounded-md bg-slate-900/40" aria-hidden />
              ))}
              {dayKeys.map((dateKey) => {
                const n = counts[dateKey] ?? 0;
                const dayNum = Number(dateKey.slice(-2));
                return (
                  <Link
                    key={dateKey}
                    href={buildFindSevaHref(dateKey)}
                    className={`flex h-full min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-[11px] font-semibold leading-none transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-sky-400 sm:min-h-[3.75rem] sm:text-xs md:min-h-[4.25rem] ${
                      n > 0
                        ? "border-sky-500/80 bg-sky-900/50 text-sky-50"
                        : "border-slate-700/80 bg-slate-900/60 text-slate-500"
                    }`}
                  >
                    <span className="text-sm leading-none sm:text-base">{dayNum}</span>
                    {n > 0 && (
                      <span className="text-[8px] font-bold leading-tight text-amber-300 sm:text-[10px]">
                        {n} {n === 1 ? "activity" : "activities"}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
