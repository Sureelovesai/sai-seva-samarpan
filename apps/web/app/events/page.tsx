import Link from "next/link";
import { formatPortalEventStart } from "@/lib/formatPortalEventStart";
import { prisma } from "@/lib/prisma";
import { isPortalEventTableMissing } from "@/lib/prismaMissingPortalEvent";
import { EventsPageShell } from "./EventsPageShell";

export const dynamic = "force-dynamic";

type PublishedEventListItem = {
  id: string;
  title: string;
  description: string | null;
  heroImageUrl: string | null;
  startsAt: Date;
  venue: string | null;
  signupsEnabled: boolean;
};

export default async function EventsListPage() {
  let data: { upcoming: PublishedEventListItem[]; past: PublishedEventListItem[] };
  try {
    data = await loadPublishedEvents();
  } catch (e: unknown) {
    if (isPortalEventTableMissing(e)) {
      return <EventsSchemaNotice />;
    }
    throw e;
  }

  const { upcoming, past } = data;
  const hasAny = upcoming.length > 0 || past.length > 0;

  return (
    <EventsPageShell>
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-12 sm:pt-14">
        <header className="events-hero-panel px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Community</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Events</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-700">
            Upcoming and past gatherings. Open an event for details and to RSVP (Yes / No / Maybe) when sign-ups are
            enabled.
          </p>
        </header>

        {!hasAny ? (
          <div className="events-empty-panel mt-10 px-6 py-12 text-center">
            <p className="font-semibold text-slate-800">No published events at the moment.</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">
              Events must be set to <strong className="text-slate-900">Published</strong> in{" "}
              <strong className="text-slate-900">Event Admin → Manage Events → Edit</strong> to appear here (Draft stays
              admin-only).
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {upcoming.length > 0 ? (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-sky-900">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" aria-hidden />
                  Upcoming
                </h2>
                <ul className="space-y-5">
                  {upcoming.map((e) => (
                    <EventListCard key={e.id} e={e} />
                  ))}
                </ul>
              </section>
            ) : null}
            {past.length > 0 ? (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400 ring-2 ring-slate-200" aria-hidden />
                  Past
                </h2>
                <ul className="space-y-5">
                  {past.map((e) => (
                    <EventListCard key={e.id} e={e} muted />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </EventsPageShell>
  );
}

function EventListCard({
  e,
  muted,
}: {
  e: {
    id: string;
    title: string;
    description: string | null;
    heroImageUrl: string | null;
    startsAt: Date;
    signupsEnabled: boolean;
  };
  muted?: boolean;
}) {
  return (
    <li>
      <Link
        href={`/events/${e.id}`}
        className={`events-card-link group ${muted ? "events-card-muted" : ""}`}
      >
        <div className="flex flex-col sm:flex-row">
          <div
            className={`relative h-40 w-full shrink-0 sm:h-auto sm:w-48 ${e.heroImageUrl ? "bg-sky-100" : "bg-gradient-to-br from-sky-200 via-cyan-50 to-amber-100"}`}
          >
            {e.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.heroImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 px-4 text-center">
                <span className="rounded-2xl bg-white p-3 text-sky-600 shadow-md ring-2 ring-sky-200">
                  <CalendarGlyph className="h-8 w-8" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-sky-800">Event</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 p-5 sm:py-5 sm:pl-5 sm:pr-6">
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-sky-800">{e.title}</h2>
            <p className="mt-1.5 text-sm font-semibold text-sky-800">{formatPortalEventStart(e.startsAt)}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-700">{e.description}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  e.signupsEnabled
                    ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300"
                    : "bg-slate-200 text-slate-800 ring-1 ring-slate-300"
                }`}
              >
                {e.signupsEnabled ? "RSVP open" : "RSVP closed"}
              </span>
            </div>
            <span className="events-cta">View details →</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function CalendarGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

async function loadPublishedEvents(): Promise<{
  upcoming: PublishedEventListItem[];
  past: PublishedEventListItem[];
}> {
  const now = new Date();
  const upcoming = await prisma.portalEvent.findMany({
    where: { status: "PUBLISHED", startsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      heroImageUrl: true,
      startsAt: true,
      venue: true,
      signupsEnabled: true,
    },
  });
  const past = await prisma.portalEvent.findMany({
    where: { status: "PUBLISHED", startsAt: { lt: now } },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      heroImageUrl: true,
      startsAt: true,
      venue: true,
      signupsEnabled: true,
    },
  });
  return { upcoming, past };
}

function EventsSchemaNotice() {
  return (
    <EventsPageShell>
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="events-notice-panel px-6 py-10">
          <h1 className="text-2xl font-bold text-slate-900">Events are almost ready</h1>
          <p className="mt-3 text-sm text-slate-700">
            The events database tables are not on this database yet. From the project folder{" "}
            <code className="rounded-md bg-white px-1.5 py-0.5 text-xs text-slate-900 ring-2 ring-amber-300">
              apps/web
            </code>
            , run:
          </p>
          <pre className="mx-auto mt-4 max-w-full overflow-x-auto rounded-xl border-2 border-sky-400 bg-sky-100 p-4 text-left text-xs font-medium text-slate-900 shadow-sm">
            npx prisma migrate deploy
          </pre>
          <p className="mt-4 text-xs text-slate-600">
            Use the same <code className="rounded bg-white px-1 font-medium text-slate-900 ring-1 ring-amber-300">DATABASE_URL</code>{" "}
            as this app. Then refresh this page.
          </p>
          <Link href="/" className="events-backlink mt-8 inline-block text-sm">
            ← Home
          </Link>
        </div>
      </div>
    </EventsPageShell>
  );
}
