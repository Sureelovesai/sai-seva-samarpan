"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CENTERS_FOR_FILTER } from "@/lib/cities";
import { SEVA_CATEGORIES_FOR_FILTER } from "@/lib/categories";
import { USA_REGIONS_FOR_FILTER, isValidUsaRegion } from "@/lib/usaRegions";

const ACTIVITY_STATUS_OPTIONS = ["All", "DRAFT", "PUBLISHED", "ARCHIVED"] as const;

type SevaActivity = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  city: string;
  organizationName: string | null;
  startDate: string | null; // ISO string
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  address: string | null;
  capacity: number | null;
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

/** Category-based color for tiles */
function tileBg(category: string) {
  const c = (category || "").toLowerCase();
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

function initialActivityStatus(sp: ReturnType<typeof useSearchParams>) {
  const st = sp.get("activityStatus");
  if (st === "DRAFT" || st === "PUBLISHED" || st === "ARCHIVED") return st;
  return "All";
}

function initialDate(sp: ReturnType<typeof useSearchParams>) {
  const date = sp.get("date");
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function initialUsaRegion(sp: ReturnType<typeof useSearchParams>) {
  const r = sp.get("usaRegion") || "";
  return r && isValidUsaRegion(r) ? r : "All";
}

/** Remount when query string changes so state matches deep links (e.g. admin calendar). */
function FindSevaKeyed() {
  const searchParams = useSearchParams();
  return <FindSevaContent key={searchParams.toString()} />;
}

function FindSevaContent() {
  const sp = useSearchParams();

  const [category, setCategory] = useState(() => sp.get("category") || "All");
  const [center, setCenter] = useState(() => sp.get("city") || "All");
  const [usaRegion, setUsaRegion] = useState(() => initialUsaRegion(sp));
  const [q, setQ] = useState("");
  const [eventDate, setEventDate] = useState(() => initialDate(sp));
  const [activityStatus, setActivityStatus] = useState(() => initialActivityStatus(sp));

  const [appliedCategory, setAppliedCategory] = useState(() => sp.get("category") || "All");
  const [appliedCenter, setAppliedCenter] = useState(() => sp.get("city") || "All");
  const [appliedUsaRegion, setAppliedUsaRegion] = useState(() => initialUsaRegion(sp));
  const [appliedQ, setAppliedQ] = useState("");
  const [appliedDate, setAppliedDate] = useState(() => initialDate(sp));
  const [appliedActivityStatus, setAppliedActivityStatus] = useState(() => initialActivityStatus(sp));

  const [items, setItems] = useState<SevaActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Fetch from DB whenever applied filters change
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (appliedCategory) params.set("category", appliedCategory);
        if (appliedCenter) params.set("city", appliedCenter);
        if (appliedUsaRegion && appliedUsaRegion !== "All") {
          params.set("usaRegion", appliedUsaRegion);
        }
        if (appliedDate && /^\d{4}-\d{2}-\d{2}$/.test(appliedDate)) {
          params.set("date", appliedDate);
        }
        if (appliedActivityStatus && appliedActivityStatus !== "All") {
          params.set("activityStatus", appliedActivityStatus);
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
  }, [appliedCategory, appliedCenter, appliedUsaRegion, appliedDate, appliedActivityStatus]);

  // Fuzzy search is applied client-side to whatever came from DB
  const filtered = useMemo(() => {
    const query = appliedQ.trim();
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
      ].join(" ");
      return fuzzyMatch(query, blob);
    });
  }, [items, appliedQ]);

  return (
    <div className="min-h-screen pt-2 bg-[radial-gradient(circle_at_40%_20%,rgba(255,255,255,0.65),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(180,190,210,0.85),rgba(120,210,230,0.75),rgba(180,190,210,0.85))]">
      <div className="mx-auto max-w-6xl px-4 py-10">
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

          <div>
            <label className="block text-sm font-semibold text-zinc-800">
              Event date (optional)
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-2 w-full rounded-none border border-zinc-600 bg-white px-4 py-3 text-zinc-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-800">
              Activity status
            </label>
            <select
              value={activityStatus}
              onChange={(e) => setActivityStatus(e.target.value)}
              className="mt-2 w-full rounded-none border border-zinc-600 bg-white px-4 py-3 text-zinc-900 outline-none"
            >
              {ACTIVITY_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All (default)" : s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-800">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setAppliedCategory(category);
                  setAppliedCenter(center);
                  setAppliedUsaRegion(usaRegion);
                  setAppliedQ(q);
                  setAppliedDate(eventDate);
                  setAppliedActivityStatus(activityStatus);
                }
              }}
              placeholder="Search Seva"
              className="mt-2 w-full rounded-none border border-zinc-600 bg-white px-4 py-3 text-zinc-900 outline-none"
            />
          </div>

          <div className="md:pb-[2px]">
            <button
              type="button"
              onClick={() => {
                setAppliedCategory(category);
                setAppliedCenter(center);
                setAppliedUsaRegion(usaRegion);
                setAppliedQ(q);
                setAppliedDate(eventDate);
                setAppliedActivityStatus(activityStatus);
              }}
              className="mt-6 w-full bg-emerald-800 px-6 py-3 text-lg font-semibold italic text-white shadow hover:bg-emerald-900 md:mt-0"
            >
              Apply
            </button>
          </div>
        </div>

        {/* STATUS LINE */}
        <div className="mt-6 space-y-1 text-center text-sm font-semibold text-zinc-800">
          {appliedUsaRegion !== "All" && (
            <p className="text-indigo-800">
              Filtered by region: <span className="font-semibold">{appliedUsaRegion}</span>
              {appliedCenter !== "All" ? (
                <>
                  {" "}
                  and center <span className="font-semibold">{appliedCenter}</span>
                </>
              ) : null}
              .
            </p>
          )}
          {appliedDate && (
            <p className="text-indigo-800">
              Showing activities that include{" "}
              <span className="whitespace-nowrap">{appliedDate}</span> (past events included).
            </p>
          )}
          {loading && "Loading activities..."}
          {!loading && error && <span className="text-red-700">{error}</span>}
        </div>

        {/* RESULTS */}
        <div className="mt-8 space-y-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="mx-auto grid w-full grid-cols-[180px_1fr] items-stretch overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.22)]"
            >
              {/* LEFT IMAGE - fixed space; image centered vertically (symmetric up/down) on all viewports */}
              <div className="flex min-h-0 h-full min-h-[140px] w-[180px] shrink-0 items-center justify-center overflow-hidden bg-zinc-200">
                <div className="relative aspect-[9/8] w-full max-w-[180px] overflow-hidden">
                {(() => {
                  const src = item.imageUrl ?? "/swami-circle.jpeg";
                  const isRelativeOrBlob =
                    src.startsWith("/") || src.includes("blob.vercel-storage.com");
                  if (isRelativeOrBlob) {
                    return (
                      <Image
                        src={src}
                        alt={item.title}
                        fill
                        className="object-contain object-center"
                        sizes="180px"
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

              {/* RIGHT PANEL */}
              <div className={`${tileBg(item.category)} px-10 py-8`}>
                <div className="text-3xl font-semibold tracking-wide text-zinc-900">
                  {item.title}
                </div>

                <div className="mt-3 text-lg font-semibold text-zinc-800">
                  {formatWhenWhere(item)}
                </div>

                <div className="mt-2 text-sm font-semibold text-zinc-700">
                  {item.category}
                </div>

                {item.organizationName && (
                  <div className="mt-2 text-base font-semibold text-indigo-900">
                    {item.organizationName}
                  </div>
                )}

                <div className="mt-8">
                  <Link
                    href={`/seva-activities?id=${encodeURIComponent(item.id)}`}
                    className="inline-block bg-white px-10 py-3 text-base font-medium text-zinc-800 shadow hover:bg-zinc-50"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {!loading && !error && filtered.length === 0 && (
            <div className="rounded-lg bg-white/70 p-6 text-center text-zinc-800">
              No seva activities found.
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