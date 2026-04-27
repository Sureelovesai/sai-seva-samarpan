import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicEventSignups } from "@/lib/loadPublicEventSignups";
import { prisma } from "@/lib/prisma";
import { isPortalEventTableMissing } from "@/lib/prismaMissingPortalEvent";
import { EventsPageShell } from "../EventsPageShell";
import { EventSignupsSummary } from "./EventSignupsSummary";
import { EventRsvpForm } from "./RsvpForm";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let event;
  try {
    event = await prisma.portalEvent.findFirst({
      where: { id, status: "PUBLISHED" },
    });
  } catch (e: unknown) {
    if (isPortalEventTableMissing(e)) {
      return (
        <EventsPageShell>
          <div className="mx-auto max-w-lg px-4 py-16 text-center">
            <div className="events-notice-panel px-6 py-10">
              <h1 className="text-xl font-bold text-slate-900">Events database not migrated</h1>
              <p className="mt-2 text-sm text-slate-700">
                Run{" "}
                <code className="rounded-md border-2 border-sky-400 bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-slate-900">
                  npx prisma migrate deploy
                </code>{" "}
                in{" "}
                <code className="rounded-md bg-white px-1.5 py-0.5 text-xs font-medium text-slate-900 ring-2 ring-amber-300">
                  apps/web
                </code>
                , then refresh.
              </p>
              <Link href="/events" className="events-backlink mt-6 inline-block text-sm">
                ← Events
              </Link>
            </div>
          </div>
        </EventsPageShell>
      );
    }
    throw e;
  }
  if (!event) notFound();

  const signups = await loadPublicEventSignups(event.id);

  const flyerLower = event.flyerUrl?.toLowerCase() ?? "";
  const flyerIsPdf = flyerLower.endsWith(".pdf") || flyerLower.includes("/pdf");
  const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(event.startsAt);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(event.startsAt);
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(event.startsAt);

  return (
    <EventsPageShell>
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:pt-10">
        <Link href="/events" className="events-backlink inline-flex items-center gap-1 text-sm">
          ← All events
        </Link>

        <article className="events-article mt-6">
          {event.heroImageUrl ? (
            <div className="w-full overflow-hidden border-b border-zinc-200 bg-zinc-100">
              {/* Full width + natural height so wide event banners (e.g. 3:1) fill the column instead of
                  floating inside a fixed 16:9 box with letterboxing. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.heroImageUrl}
                alt=""
                className="block h-auto w-full max-h-[85vh] object-contain"
              />
            </div>
          ) : null}

          <div className={`px-5 pb-2 sm:px-8 ${event.heroImageUrl ? "pt-6" : "pt-6 sm:pt-8"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{event.title}</h1>
              {event.signupsEnabled ? (
                <a
                  href="#event-signup"
                  aria-label="Jump to sign up section"
                  className="group inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/60 px-3 py-1.5 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100/70"
                >
                  <span>Sign up</span>
                  <span
                    aria-hidden
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-violet-700 ring-1 ring-violet-200 transition group-hover:translate-y-0.5"
                  >
                    ↓
                  </span>
                </a>
              ) : null}
            </div>
            <p className="mt-4 whitespace-pre-wrap leading-relaxed text-slate-800">{event.description}</p>
          </div>

          <div className="events-venue-block mx-5 mb-6 p-5 sm:mx-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-amber-900">Event details</h2>
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-[88px_1fr] items-start gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Day</p>
                <p className="text-base font-medium text-slate-900">{dayLabel}</p>
              </div>
              <div className="grid grid-cols-[88px_1fr] items-start gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Date</p>
                <p className="text-base font-medium text-slate-900">{dateLabel}</p>
              </div>
              <div className="grid grid-cols-[88px_1fr] items-start gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Time</p>
                <p className="text-base font-medium text-slate-900">{timeLabel}</p>
              </div>
              <div className="grid grid-cols-[88px_1fr] items-start gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Venue</p>
                <p className="whitespace-pre-wrap text-base font-medium text-slate-900">{event.venue}</p>
              </div>
            </div>
          </div>

          {event.flyerUrl ? (
            <div className="events-flyer-block px-5 py-6 sm:px-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-sky-900">Flyer</h2>
              {flyerIsPdf ? (
                <div className="mt-3 space-y-3">
                  <a
                    href={event.flyerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="events-backlink inline-block text-sm font-semibold no-underline hover:underline"
                  >
                    Download / open PDF →
                  </a>
                  <iframe
                    title="Event flyer"
                    src={event.flyerUrl}
                    className="h-[480px] w-full rounded-xl border-2 border-sky-300 bg-white shadow-sm"
                  />
                </div>
              ) : (
                <div className="relative mt-3 max-h-[560px] overflow-auto rounded-xl border-2 border-sky-300 bg-white p-3 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={event.flyerUrl} alt="Event flyer" className="mx-auto max-w-full object-contain" />
                </div>
              )}
            </div>
          ) : null}

          <div id="event-signup" className="events-rsvp-band px-5 py-8 sm:px-8">
            <h2 className="text-xl font-bold text-slate-900">Sign up</h2>
            {event.signupsEnabled ? (
              <>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-700">
                  Let us know if you plan to attend. You can respond <strong className="text-slate-900">Yes</strong>,{" "}
                  <strong className="text-slate-900">No</strong>, or <strong className="text-slate-900">Maybe</strong>, and
                  list <strong className="text-slate-900">adults</strong> and{" "}
                  <strong className="text-slate-900">kids</strong> in your group (including yourself).
                </p>
                <EventRsvpForm eventId={event.id} />
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-700">Organizers are not collecting RSVPs for this event online.</p>
            )}
          </div>

          <EventSignupsSummary signups={signups} />
        </article>
      </div>
    </EventsPageShell>
  );
}
