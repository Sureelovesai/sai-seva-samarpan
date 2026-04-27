"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { FindSevaActivityRow } from "@/app/_components/FindSevaActivityRow";
import {
  buildSevaMahotsavamActivitiesPageUrlFromFindSeva,
  type FindSevaBrowseContext,
} from "@/lib/sevaActivitiesBrowseQuery";
import { compareFindSevaActivities } from "@/lib/findSevaListSort";
import { MAHOTSAVAM_REGIONAL_PROGRAM_DISPLAY_TITLE } from "@/lib/mahotsavamRegionalLanding";

/** Public API list row — only fields the card needs, plus `group` for the Mahotsavam filter. */
type SevaActivity = {
  id: string;
  title: string;
  category: string;
  city: string;
  sevaUsaRegion?: string | null;
  organizationName: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationHours?: number | null;
  imageUrl: string | null;
  capacity: number | null;
  spotsRemaining?: number | null;
  group?: { id: string; title: string } | null;
};

/**
 * Standalone URL for the Sri Sathya Sai Seva Mahotsavam regional program: no main site header/footer,
 * no level tabs or filters. Same `View Details` / Seva Details join flow as Find Seva.
 * @see /find-seva (unchanged full browser)
 */
function MahotsavamContent() {
  const [items, setItems] = useState<SevaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("sevaScope", "REGIONAL");
        params.set("sevaProgram", "regional-mahotsavam");
        const res = await fetch(`/api/seva-activities?${params.toString()}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.detail || body?.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as SevaActivity[];
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setError(e instanceof Error ? e.message : "Failed to load activities");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** List is pre-filtered by `sevaProgram=regional-mahotsavam` on the API; apply same sort as Find Seva. */
  const sortedItems = useMemo(
    () => items.slice().sort(compareFindSevaActivities),
    [items]
  );

  const browseCtx: FindSevaBrowseContext = useMemo(
    () => ({
      levelTab: "regional",
      center: "All",
      usaRegion: "All",
      fromDate: "",
      toDate: "",
      category: "All",
    }),
    []
  );

  const getSevaDetailsHref = useCallback(
    (id: string) => buildSevaMahotsavamActivitiesPageUrlFromFindSeva(id, browseCtx),
    [browseCtx]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_40%_20%,rgba(255,255,255,0.65),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(180,190,210,0.85),rgba(120,210,230,0.75),rgba(180,190,210,0.85))]">
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-5 sm:max-w-4xl sm:px-6 md:max-w-6xl">
        <header className="mb-8 text-center">
          <p className="mx-auto max-w-2xl text-xs leading-relaxed text-zinc-700 sm:text-base">
            Use <strong>View Details</strong> for Seva Details and sign up.
          </p>
        </header>

        {loading && <p className="text-center text-zinc-600">Loading activities…</p>}
        {error && !loading && <p className="text-center text-red-700">{error}</p>}
        {!loading && !error && sortedItems.length === 0 && (
          <div className="space-y-3 rounded-lg bg-white/70 p-6 text-center text-zinc-800">
            <p>
              No open <strong>regional</strong> Seva Mahotsavam activities are available right now. They must be
              published, not past end date, in scope <strong>Regional</strong>, and linked to a published program group
              whose name includes <strong>{MAHOTSAVAM_REGIONAL_PROGRAM_DISPLAY_TITLE}</strong> (or the same key words) in{" "}
              <strong>Add Seva Activity</strong> → program group.
            </p>
            <p className="text-sm text-zinc-600">
              Use{" "}
              <Link className="font-semibold text-indigo-800 underline" href="/find-seva?level=regional">
                Find Seva (Regional)
              </Link>{" "}
              to confirm the program appears there under that group.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {sortedItems.map((item) => (
            <FindSevaActivityRow
              key={item.id}
              item={item}
              levelTab="regional"
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
    </div>
  );
}

export default function SevaMahotsavamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-[radial-gradient(circle_at_40%_20%,rgba(255,255,255,0.65),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(180,190,210,0.85),rgba(120,210,230,0.75),rgba(180,190,210,0.85))] text-lg text-zinc-600">
          Loading…
        </div>
      }
    >
      <MahotsavamContent />
    </Suspense>
  );
}
