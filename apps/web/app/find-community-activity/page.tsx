"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CENTERS_FOR_FILTER } from "@/lib/cities";
import { SEVA_CATEGORIES_FOR_FILTER } from "@/lib/categories";
import { USA_REGIONS_FOR_FILTER, parseUsaRegionParam } from "@/lib/usaRegions";

type Row = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  city: string;
  organizationName: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  address: string | null;
  imageUrl: string | null;
};

function norm(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function fuzzy(q: string, blob: string) {
  const a = norm(q);
  if (!a) return true;
  const b = norm(blob);
  return b.includes(a) || a.split(" ").every((t) => t && b.includes(t));
}

function tileBg(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("online")) return "bg-sky-200/80";
  if (c.includes("food") || c.includes("narayana")) return "bg-green-200/80";
  if (c.includes("medicare")) return "bg-blue-200/80";
  if (c.includes("sociocare")) return "bg-orange-200/80";
  if (c.includes("educare")) return "bg-yellow-200/80";
  if (c.includes("environmental") || c.includes("go green")) return "bg-teal-200/80";
  return "bg-purple-200/80";
}

function timeToAMPM(hhmm: string | null): string {
  if (!hhmm?.trim()) return "";
  const [h, m] = hhmm.trim().split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return hhmm;
  const min = (m ?? "00").padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, mo, day] = String(iso).slice(0, 10).split("-").map(Number);
  if (Number.isNaN(y)) return "";
  return new Date(y, mo - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatWhenWhere(a: Row) {
  const startStr = formatDateOnly(a.startDate);
  const endStr = formatDateOnly(a.endDate);
  let dateStr = "";
  if (startStr && endStr) dateStr = startStr === endStr ? startStr : `${startStr} – ${endStr}`;
  else dateStr = startStr || endStr;
  const timeStr = [timeToAMPM(a.startTime), timeToAMPM(a.endTime)].filter(Boolean).join(" – ");
  const parts = [dateStr, timeStr].filter(Boolean).join(", ");
  return [parts, a.city || ""].filter(Boolean).join(" — ");
}

function initialDate(sp: ReturnType<typeof useSearchParams>) {
  const date = sp.get("date");
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}
function initialUsaRegion(sp: ReturnType<typeof useSearchParams>) {
  const r = sp.get("usaRegion") || "";
  const canon = parseUsaRegionParam(r);
  return canon ?? "All";
}

function Keyed() {
  const sp = useSearchParams();
  return <Content key={sp.toString()} />;
}

function Content() {
  const sp = useSearchParams();
  const [category, setCategory] = useState(() => sp.get("category") || "All");
  const [center, setCenter] = useState(() => sp.get("city") || "All");
  const [usaRegion, setUsaRegion] = useState(() => initialUsaRegion(sp));
  const [q, setQ] = useState("");
  const [eventDate, setEventDate] = useState(() => initialDate(sp));
  const [appliedCategory, setAppliedCategory] = useState(() => sp.get("category") || "All");
  const [appliedCenter, setAppliedCenter] = useState(() => sp.get("city") || "All");
  const [appliedUsaRegion, setAppliedUsaRegion] = useState(() => initialUsaRegion(sp));
  const [appliedQ, setAppliedQ] = useState("");
  const [appliedDate, setAppliedDate] = useState(() => initialDate(sp));
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const p = new URLSearchParams();
        if (appliedCategory) p.set("category", appliedCategory);
        if (appliedCenter) p.set("city", appliedCenter);
        if (appliedUsaRegion !== "All") p.set("usaRegion", appliedUsaRegion);
        if (/^\d{4}-\d{2}-\d{2}$/.test(appliedDate)) p.set("date", appliedDate);
        const res = await fetch(`/api/community-activities?${p}`, { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as Row[];
        if (!c) setItems(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if (!c) {
          setItems([]);
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [appliedCategory, appliedCenter, appliedUsaRegion, appliedDate]);

  const filtered = useMemo(() => {
    const query = appliedQ.trim();
    if (!query) return items;
    return items.filter((a) =>
      fuzzy(query, [a.title, a.category, a.description, a.city, a.organizationName, a.locationName, a.address].join(" "))
    );
  }, [items, appliedQ]);

  const apply = () => {
    setAppliedCategory(category);
    setAppliedCenter(center);
    setAppliedUsaRegion(usaRegion);
    setAppliedQ(q);
    setAppliedDate(eventDate);
  };

  return (
    <div className="min-h-screen pt-2 bg-[radial-gradient(circle_at_40%_20%,rgba(255,255,255,0.65),transparent),linear-gradient(90deg,rgba(200,190,230,0.88),rgba(140,180,220,0.82),rgba(200,190,230,0.88))]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-zinc-900 sm:text-4xl">Find community activities</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-700">
            Listings from approved Community Outreach organizations. For other seva, use{" "}
            <Link href="/find-seva" className="font-semibold text-indigo-800 underline">
              Find Seva
            </Link>
            .
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:items-end">
          <div>
            <label className="block text-sm font-semibold text-zinc-800">Service category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full border border-zinc-600 bg-white px-4 py-3 text-zinc-900"
            >
              {SEVA_CATEGORIES_FOR_FILTER.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-800">Center / Group</label>
            <select
              value={center}
              onChange={(e) => setCenter(e.target.value)}
              className="mt-2 w-full border-b-2 border-indigo-600 bg-white px-4 py-3 text-zinc-900"
            >
              {CENTERS_FOR_FILTER.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-800">USA Region</label>
            <select
              value={usaRegion}
              onChange={(e) => setUsaRegion(e.target.value)}
              className="mt-2 w-full border border-zinc-600 bg-white px-4 py-3 text-zinc-900"
            >
              {USA_REGIONS_FOR_FILTER.map((r) => (
                <option key={r} value={r}>
                  {r === "All" ? "All regions" : r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-800">Event date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-2 w-full border border-zinc-600 bg-white px-4 py-3 text-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-800">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="Organization, title, city…"
              className="mt-2 w-full border border-zinc-600 bg-white px-4 py-3 text-zinc-900"
            />
          </div>
          <div className="md:pb-[2px]">
            <button
              type="button"
              onClick={apply}
              className="mt-6 w-full bg-indigo-800 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-900 md:mt-0"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm font-semibold text-zinc-800">
          {loading && "Loading…"}
          {error && <span className="text-red-700">{error}</span>}
        </div>

        <div className="mt-8 space-y-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="mx-auto grid w-full min-w-0 grid-cols-1 shadow-lg md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] md:overflow-hidden"
            >
              <div className="flex min-h-[140px] w-full items-center justify-center overflow-hidden bg-zinc-200 md:min-h-0 md:h-full md:w-[180px] md:shrink-0">
                <div className="relative aspect-[9/8] w-full max-w-[min(100%,280px)] overflow-hidden md:max-w-[180px]">
                  {(() => {
                    const src = item.imageUrl ?? "/swami-circle.jpeg";
                    const local = src.startsWith("/") || src.includes("blob.vercel-storage.com");
                    return local ? (
                      <Image
                        src={src}
                        alt={item.title}
                        fill
                        className="object-contain object-center"
                        sizes="(max-width: 767px) 90vw, 180px"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={item.title} className="h-full w-full object-contain" />
                    );
                  })()}
                </div>
              </div>
              <div className={`${tileBg(item.category)} min-w-0 px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10`}>
                <div className="rounded-lg border border-indigo-900/20 bg-white/50 px-3 py-3 sm:px-4">
                  <p className="text-xs font-bold uppercase text-indigo-800">Organization</p>
                  <p className="break-words text-lg font-bold text-indigo-950 sm:text-xl">
                    {item.organizationName || "Community organization"}
                  </p>
                </div>
                <div className="mt-4 break-words text-2xl font-semibold text-zinc-900 sm:text-3xl">{item.title}</div>
                <div className="mt-3 break-words text-base font-semibold leading-snug text-zinc-800 sm:text-lg">
                  {formatWhenWhere(item)}
                </div>
                <div className="mt-2 break-words text-sm font-semibold text-zinc-700">{item.category}</div>
                <div className="mt-6 md:mt-8">
                  <Link
                    href={`/community-activity-details?id=${encodeURIComponent(item.id)}`}
                    className="block w-full bg-white px-6 py-3 text-center text-base font-medium text-zinc-800 shadow hover:bg-zinc-50 md:inline-block md:w-auto md:px-10 md:text-left"
                  >
                    View details &amp; sign up
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {!loading && !error && filtered.length === 0 && (
            <div className="rounded-lg bg-white/70 p-6 text-center text-zinc-800">
              No community activities match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={<div className="flex min-h-[40vh] items-center justify-center text-zinc-600">Loading…</div>}
    >
      <Keyed />
    </Suspense>
  );
}
