"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PortalEventForm, type PortalEventFormInitial } from "@/app/admin/_components/PortalEventForm";

/** If the source start is in the past, bump forward in 7-day steps until it is in the future (same clock time). */
function suggestedCloneStartsAt(iso: string): string {
  let d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = Date.now();
  while (d.getTime() <= now) {
    d = new Date(d.getTime() + 7 * 86400000);
  }
  return d.toISOString();
}

function cloneInitialFromLoaded(data: Record<string, unknown>): PortalEventFormInitial {
  const title = typeof data.title === "string" ? data.title : "";
  const startsAtRaw = data.startsAt;
  const startsAt =
    typeof startsAtRaw === "string"
      ? startsAtRaw
      : startsAtRaw instanceof Date
        ? startsAtRaw.toISOString()
        : new Date().toISOString();

  return {
    id: String(data.id ?? ""),
    title: /\s*\(copy\)\s*$/i.test(title) ? title : `${title} (copy)`,
    description: typeof data.description === "string" ? data.description : "",
    venue: typeof data.venue === "string" ? data.venue : "",
    startsAt: suggestedCloneStartsAt(startsAt),
    heroImageUrl: typeof data.heroImageUrl === "string" ? data.heroImageUrl : null,
    flyerUrl: typeof data.flyerUrl === "string" ? data.flyerUrl : null,
    signupsEnabled: data.signupsEnabled !== false,
    status:
      data.status === "PUBLISHED" || data.status === "ARCHIVED" || data.status === "DRAFT"
        ? data.status
        : "PUBLISHED",
    organizerEmail: typeof data.organizerEmail === "string" ? data.organizerEmail : null,
  };
}

export default function EditEventPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const isCloneMode = searchParams.get("mode") === "clone";

  const [initial, setInitial] = useState<PortalEventFormInitial | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);

  useEffect(() => {
    setCloneSuccess(null);
  }, [id, isCloneMode]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/admin/portal-events/${encodeURIComponent(id)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Not found");
        if (cancelled) return;

        if (isCloneMode) {
          setInitial(cloneInitialFromLoaded(data));
        } else {
          setInitial({
            id: data.id,
            title: data.title,
            description: data.description,
            venue: data.venue,
            startsAt: data.startsAt,
            heroImageUrl: data.heroImageUrl,
            flyerUrl: data.flyerUrl,
            signupsEnabled: data.signupsEnabled,
            status: data.status,
            organizerEmail: data.organizerEmail ?? null,
          });
        }
      } catch (e: unknown) {
        if (!cancelled) setLoadError((e as Error)?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isCloneMode]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Community Events</strong> — Public listings live under the site <strong>Events</strong> menu. Only{" "}
          <strong>Published</strong> events appear there.
        </div>

        {cloneSuccess ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            {cloneSuccess}
          </p>
        ) : null}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {isCloneMode ? "Clone Community Event" : "Edit Event"}
            </h1>
            {isCloneMode ? (
              <p className="mt-1 max-w-xl text-sm text-zinc-600">
                You are creating a <strong className="text-zinc-800">new</strong> event from this template. RSVP responses
                are not copied. Adjust the title, date, and visibility before publishing.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isCloneMode ? (
              <Link
                href={`/admin/manage-events/${encodeURIComponent(id)}`}
                className="rounded-full border-2 border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 shadow-sm hover:bg-indigo-50"
              >
                Switch to Edit Event
              </Link>
            ) : (
              <Link
                href={`/admin/manage-events/${encodeURIComponent(id)}?mode=clone`}
                className="rounded-full border-2 border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 shadow-sm hover:bg-indigo-50"
              >
                Switch to Clone Event
              </Link>
            )}
            <Link
              href="/admin/manage-events"
              className="text-sm font-semibold text-sky-800 underline hover:no-underline"
            >
              ← All events
            </Link>
          </div>
        </div>

        {loading ? <p className="text-zinc-600">Loading…</p> : null}
        {loadError ? <p className="text-red-600">{loadError}</p> : null}

        {!loading && initial ? (
          <PortalEventForm
            mode={isCloneMode ? "clone" : "edit"}
            initial={initial}
            onSaved={(ev) => {
              if (ev.kind === "clone" && ev.title) {
                setCloneSuccess(
                  `Cloned successfully: ${ev.title}. This page stays on the source event so you can submit another clone if needed. Open the new event from Manage Events.`
                );
                return;
              }
              router.refresh();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
