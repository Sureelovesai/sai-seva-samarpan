import Link from "next/link";
import { formatPortalEventStart } from "@/lib/formatPortalEventStart";
import { prisma } from "@/lib/prisma";
import { isPortalEventTableMissing } from "@/lib/prismaMissingPortalEvent";
import { EventsPageShell } from "../EventsPageShell";

export const dynamic = "force-dynamic";

type PublishedEventListItem = {
  id: string;
  title: string;
  description: string | null;
  heroImageUrl: string | null;
  startsAt: Date;
  venue: string | null;
  signupsEnabled: boolean;
  city: string;
};

interface Params {
  city: string;
}

export default async function EventsListPage({ params }: { params: Promise<Params> }) {
  const { city } = await params;
  const cityName = decodeURIComponent(city).replace(/-/g, " ");
  const formattedCity = cityName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  let data: { upcoming: PublishedEventListItem[]; past: PublishedEventListItem[] };
  try {
    data = await loadPublishedEvents(formattedCity);
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
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:pt-14">
        <header className="px-1 py-2 sm:py-3">
          <Link
            href="/events"
            className="mb-4 inline-flex items-center text-sm font-semibold text-sky-700 hover:text-sky-900"
          >
            ← Back to Cities
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {formattedCity} Events
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
            Upcoming and past gatherings. Open an event for details and to RSVP (Yes / No / Maybe) when sign-ups are enabled.
          </p>
        </header>

        {!hasAny ? (
          <div className="mt-10">
            <div className="mx-auto max-w-md rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50 px-8 py-12 text-center shadow-lg">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-sky-100 p-4">
                  <svg className="h-12 w-12 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0121 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-sky-900">No Events Yet</h3>
              <p className="mt-4 text-sm text-sky-800">
                There are currently no published events in <strong>{formattedCity}</strong>.
              </p>
              <p className="mx-auto mt-4 max-w-sm text-xs leading-relaxed text-sky-700">
                Events will appear here once event coordinators create and publish them. Check back soon for exciting opportunities to serve!
              </p>
              
              <div className="mt-6 space-y-2 rounded-lg bg-white/60 px-4 py-3 text-left">
                <p className="text-xs font-semibold text-slate-600">For Event Admins:</p>
                <p className="text-xs text-slate-600">
                  Events must be set to <strong className="font-medium text-slate-800">Published</strong> in Event Admin → Manage Events to appear here.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href="/events"
                  className="inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
                >
                  ← Back to Cities
                </Link>
              </div>
            </div>
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
                    <EventListCard key={e.id} e={e} city={city} />
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
                    <EventListCard key={e.id} e={e} muted city={city} />
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
  city,
}: {
  e: PublishedEventListItem;
  muted?: boolean;
  city: string;
}) {
  return (
    <li>
      <Link
        href={`/events/${city}/${e.id}`}
        className={`events-card-link group ${muted ? "events-card-muted" : ""}`}
      >
        <div className="flex flex-col sm:flex-row">
          <div
            className={`relative h-44 w-full shrink-0 sm:h-40 sm:w-56 ${e.heroImageUrl ? "bg-sky-100" : "bg-gradient-to-br from-sky-200 via-cyan-50 to-amber-100"}`}
          >
            {e.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.heroImageUrl} alt="" className="h-full w-full object-contain p-1.5" />
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

async function loadPublishedEvents(city: string): Promise<{
  upcoming: PublishedEventListItem[];
  past: PublishedEventListItem[];
}> {
  const now = new Date();
  const upcoming = await prisma.portalEvent.findMany({
    where: { status: "PUBLISHED", startsAt: { gte: now }, city },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      heroImageUrl: true,
      startsAt: true,
      venue: true,
      signupsEnabled: true,
      city: true,
    },
  });
  const past = await prisma.portalEvent.findMany({
    where: { status: "PUBLISHED", startsAt: { lt: now }, city },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      heroImageUrl: true,
      startsAt: true,
      venue: true,
      signupsEnabled: true,
      city: true,
    },
  });
  return { upcoming, past };
}

function EventsSchemaNotice() {
  return (
    <EventsPageShell>
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-8 py-10 text-center shadow-lg">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-amber-100 p-3">
              <svg className="h-10 w-10 text-amber-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c.866.866 2.291 1.379 3.828 1.379s2.962-.513 3.828-1.379m0 0a6.374 6.374 0 0111.964 3.07M12 9a3 3 0 100-6 3 3 0 000 6zm9 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-amber-950">Database Setup Required</h2>
          <p className="mt-3 text-sm text-amber-900">
            The events database tables need to be initialized. Run this command:
          </p>
          <pre className="mx-auto mt-4 max-w-full overflow-x-auto rounded-lg border-2 border-amber-300 bg-amber-100 p-4 text-left text-xs font-medium text-amber-950 shadow-sm">
            npx prisma migrate deploy
          </pre>
          <p className="mt-4 text-xs text-amber-800">
            From the <code className="rounded bg-amber-200 px-1 font-mono text-amber-950">apps/web</code> folder
          </p>
          <Link href="/events" className="mt-6 inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 transition-colors">
            ← Back to Events
          </Link>
        </div>
      </div>
    </EventsPageShell>
  );
}
