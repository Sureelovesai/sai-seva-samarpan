"use client";

import NextImage from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isActivityEnded } from "@/lib/activityEnded";

type SevaActivity = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  city: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationHours: number | null;
  locationName: string | null;
  address: string | null;
  capacity: number | null;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  coordinatorPhone: string | null;
  imageUrl: string | null;
};

// Fallback when no activities from API
const defaultActivity: SevaActivity = {
  id: "book-drive",
  title: "Book Drive",
  category: "Educare",
  description: "Collect and donate books to Promising Pages",
  city: "Charlotte",
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
  durationHours: null,
  locationName: null,
  address: null,
  capacity: null,
  coordinatorName: null,
  coordinatorEmail: null,
  coordinatorPhone: null,
  imageUrl: null,
};

function formatDateOnly(date: string | null) {
  if (!date || (typeof date === "string" && !date.trim())) return null;
  const dateOnly = typeof date === "string" && date.includes("T") ? date.split("T")[0] : String(date).slice(0, 10);
  const d = new Date(dateOnly + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function formatTimeOnly(time: string | null) {
  if (!time || typeof time !== "string" || !time.trim()) return null;
  const part = time.slice(0, 5);
  const [h, m] = part.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  const d = new Date(2000, 0, 1, h, m ?? 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(date: string | null, time: string | null) {
  const dateStr = formatDateOnly(date);
  const timeStr = formatTimeOnly(time);
  if (!dateStr && !timeStr) return "—";
  return [dateStr, timeStr].filter(Boolean).join(", ");
}

// Icons for Seva Details fields (20x20, zinc-500)
const DetailIcons = {
  category: (
    <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /></svg>
  ),
  capacity: (
    <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
  ),
  calendar: (
    <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
  ),
  clock: (
    <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  duration: (
    <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  city: (
    <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>
  ),
  users: (
    <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
  ),
  location: (
    <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
  ),
};

const TAB_WIDTH_PX = 140;
const TAB_GAP_PX = 8;
const ARROWS_AND_GAPS_PX = 104; // << button + gap + >> button + gap (approx)

function SevaActivitiesContent() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id");
  const tabsRowRef = useRef<HTMLDivElement>(null);

  const [activities, setActivities] = useState<SevaActivity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(idFromUrl);
  const [loading, setLoading] = useState(true);
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpSubmitted, setSignUpSubmitted] = useState(false);
  const [signUpPending, setSignUpPending] = useState(false); // true when registered but over capacity
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpInfo, setSignUpInfo] = useState<string | null>(null);
  const [signUpSubmitting, setSignUpSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [tabsPage, setTabsPage] = useState(0);
  const [tabsPerPage, setTabsPerPage] = useState(5);
  const [user, setUser] = useState<{
    id: string;
    email?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  // When user loads (e.g. after clicking View Details), pre-fill name and email; leave editable
  useEffect(() => {
    if (!user) return;
    const name =
      (user.name && String(user.name).trim()) ||
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    const email = user.email ? String(user.email).trim() : "";
    setSignUpName((prev) => (prev.trim() ? prev : name));
    setSignUpEmail((prev) => (prev.trim() ? prev : email));
  }, [user?.id, user?.name, user?.firstName, user?.lastName, user?.email]);

  useEffect(() => {
    const el = tabsRowRef.current;
    if (!el) return;
    const updateTabsPerPage = () => {
      const w = el.offsetWidth;
      const available = Math.max(0, w - ARROWS_AND_GAPS_PX);
      const n = Math.floor((available + TAB_GAP_PX) / (TAB_WIDTH_PX + TAB_GAP_PX));
      const perPage = Math.max(1, Math.min(5, n));
      setTabsPerPage(perPage);
    };
    updateTabsPerPage();
    const ro = new ResizeObserver(updateTabsPerPage);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activities.length]);

  const tabsMaxPage = activities.length <= tabsPerPage ? 0 : Math.ceil(activities.length / tabsPerPage) - 1;
  const showTabsArrows = activities.length > tabsPerPage;
  const pageWidthPx = tabsPerPage * TAB_WIDTH_PX + (tabsPerPage - 1) * TAB_GAP_PX;
  const stripWidthPx = activities.length * TAB_WIDTH_PX + (activities.length - 1) * TAB_GAP_PX;
  const viewportWidthPx = Math.min(activities.length, tabsPerPage) * TAB_WIDTH_PX + (Math.min(activities.length, tabsPerPage) - 1) * TAB_GAP_PX;
  const maxOffsetPx = Math.max(0, stripWidthPx - viewportWidthPx);
  const slideOffsetPx = Math.min(tabsPage * pageWidthPx, maxOffsetPx);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/seva-activities", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const data = (await res.json()) as SevaActivity[];
        if (!cancelled) {
          setActivities(data || []);
          const idToSelect = searchParams.get("id");
          if (data?.length) {
            const exists = idToSelect && data.some((a) => a.id === idToSelect);
            const sid = exists ? idToSelect! : data[0].id;
            setSelectedId(sid);
          }
        }
      } catch {
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [searchParams]);

  // Sync tabs page so the selected tab stays in view (on load, tab click, or when tabsPerPage changes e.g. resize)
  useEffect(() => {
    if (activities.length === 0 || !selectedId || activities.length <= tabsPerPage) return;
    const idx = activities.findIndex((a) => a.id === selectedId);
    if (idx < 0) return;
    const maxP = Math.ceil(activities.length / tabsPerPage) - 1;
    const targetPage = Math.min(maxP, Math.floor(idx / tabsPerPage));
    setTabsPage(targetPage);
  }, [tabsPerPage, activities.length, selectedId]);

  // When we have activities, always use one from the list (never send fallback "book-drive" id)
  const selected = activities.find((a) => a.id === selectedId);
  const displayActivity = activities.length ? (selected ?? activities[0]) : defaultActivity;
  const activityIdToSubmit = activities.length ? (selected?.id ?? activities[0].id) : null;

  const handleJoinSeva = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    setSignUpInfo(null);
    if (activities.length === 0 || !activityIdToSubmit) {
      setSignUpError("No activity available to sign up. Add an activity in Add Seva Activity first.");
      return;
    }
    if (isActivityEnded(displayActivity)) {
      setSignUpInfo("Sairam! The Seva Activity has already been completed. Thank You for your interest in this Seva Activity. Please feel free to explore other seva opportunities as well.");
      return;
    }
    const name = signUpName.trim();
    const email = signUpEmail.trim();
    if (!name || !email) {
      setSignUpError("Name and email are required.");
      return;
    }
    setSignUpSubmitting(true);
    try {
      const res = await fetch("/api/seva-signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: activityIdToSubmit,
          name,
          email,
          phone: signUpPhone.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.detail || "Failed to sign up";
        const detail = data?.detail ? ` (${data.detail})` : "";
        throw new Error(typeof msg === "string" ? msg + detail : "Failed to sign up");
      }
      setSignUpSubmitted(true);
      setSignUpPending(data?.status === "PENDING");
    } catch (err: any) {
      setSignUpError(err?.message || "Failed to sign up. Please try again.");
    } finally {
      setSignUpSubmitting(false);
    }
  };

  const canJoinSeva = activities.length > 0 && !!activityIdToSubmit;

  if (loading && !activities.length) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,180,220,0.4),transparent),linear-gradient(180deg,rgba(200,220,240,0.5)_0%,rgba(180,200,230,0.6)_100%)]">
        <p className="text-zinc-600">Loading activities…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,180,220,0.4),transparent),radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(160,200,240,0.25),transparent),radial-gradient(ellipse_60%_40%_at_0%_50%,rgba(140,180,220,0.25),transparent),linear-gradient(180deg,rgba(200,220,240,0.5)_0%,rgba(180,200,230,0.6)_50%,rgba(160,190,220,0.5)_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Tabs: wide enough to show 5 tabs (732px) + << >> arrows */}
        <div className="mx-auto w-full max-w-4xl">
          {/* Activity tabs: up to 5 visible, << >> slide to next/prev */}
          {activities.length > 1 && (
            <div ref={tabsRowRef} className="mb-6 flex items-center gap-2">
              {showTabsArrows && (
                <button
                  type="button"
                  onClick={() => setTabsPage((p) => Math.max(0, p - 1))}
                  disabled={tabsPage === 0}
                  className="shrink-0 rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Previous activities"
                >
                  &#171;
                </button>
              )}
              <div
                className="overflow-hidden"
                style={{
                  width: Math.min(activities.length, tabsPerPage) * TAB_WIDTH_PX + (Math.min(activities.length, tabsPerPage) - 1) * TAB_GAP_PX,
                }}
              >
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{
                    gap: TAB_GAP_PX,
                    width: activities.length * TAB_WIDTH_PX + (activities.length - 1) * TAB_GAP_PX,
                    transform: `translateX(-${slideOffsetPx}px)`,
                  }}
                >
                  {activities.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className={`shrink-0 rounded border px-4 py-2 text-sm font-medium transition-colors ${
                        selectedId === a.id
                          ? "border-indigo-700 bg-indigo-700 text-white"
                          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                      }`}
                      style={{ width: TAB_WIDTH_PX, minWidth: TAB_WIDTH_PX }}
                    >
                      <span className="block truncate" title={a.title}>
                        {a.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {showTabsArrows && (
                <button
                  type="button"
                  onClick={() => setTabsPage((p) => Math.min(tabsMaxPage, p + 1))}
                  disabled={tabsPage >= tabsMaxPage}
                  className="shrink-0 rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Next activities"
                >
                  &#187;
                </button>
              )}
            </div>
          )}
        </div>

        {/* Seva Details card - blue header like attachment */}
        <div className="mt-8 overflow-hidden rounded-lg border-2 border-stone-200/90 bg-gradient-to-b from-amber-50 via-amber-50/95 to-stone-100 shadow-lg shadow-slate-200/40">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 px-6 py-3">
            <h1 className="text-lg font-semibold text-white md:text-xl">
              Seva Details Page
            </h1>
            <a
              href="#sign-up-to-volunteer"
              className="shrink-0 rounded-md bg-white/95 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-white hover:shadow"
              onClick={(e) => {
                const el = document.getElementById("sign-up-to-volunteer");
                if (el) {
                  e.preventDefault();
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              Sign up to volunteer ↓
            </a>
          </div>

          {/* Activity Overview - optimized layout: image prominent, description has space */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-indigo-900">
              {displayActivity.title}
            </h2>
            <div className="mt-4 grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px]">
              {/* Left: description (priority) + meta grid */}
              <div className="min-w-0 space-y-4 md:order-1">
                {displayActivity.description && (
                  <p className="whitespace-pre-wrap text-zinc-700">
                    {displayActivity.description}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-8">
                  <div className="flex items-center gap-2">
                    {DetailIcons.category}
                    <span className="w-[7.25rem] shrink-0 text-sm font-semibold text-zinc-600 sm:w-36">Service Category:</span>
                    <span className="min-w-0 text-zinc-800">{displayActivity.category || "—"}</span>
                  </div>
                  {displayActivity.capacity != null && displayActivity.capacity > 0 && (
                    <div className="flex items-center gap-2">
                      {DetailIcons.capacity}
                      <span className="w-[7.25rem] shrink-0 text-sm font-semibold text-zinc-600 sm:w-36">Capacity:</span>
                      <span className="min-w-0 text-zinc-800">{displayActivity.capacity} volunteer{displayActivity.capacity !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {DetailIcons.calendar}
                    <span className="w-[7.25rem] shrink-0 text-sm font-semibold text-zinc-600 sm:w-36">Date:</span>
                    <span className="min-w-0 text-zinc-800">
                      {(() => {
                        const start = formatDateOnly(displayActivity.startDate);
                        const end = formatDateOnly(displayActivity.endDate);
                        if (start && end && start !== end) return `${start} – ${end}`;
                        return start ?? end ?? "—";
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {DetailIcons.clock}
                    <span className="w-[7.25rem] shrink-0 text-sm font-semibold text-zinc-600 sm:w-36">Time:</span>
                    <span className="min-w-0 text-zinc-800">
                      {[formatTimeOnly(displayActivity.startTime), formatTimeOnly(displayActivity.endTime)].filter(Boolean).join(" – ") || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {DetailIcons.duration}
                    <span className="w-[7.25rem] shrink-0 text-sm font-semibold text-zinc-600 sm:w-36">Duration:</span>
                    <span className="min-w-0 text-zinc-800">
                      {displayActivity.durationHours != null
                        ? `${displayActivity.durationHours} hr${displayActivity.durationHours !== 1 ? "s" : ""}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {DetailIcons.city}
                    <span className="w-[7.25rem] shrink-0 text-sm font-semibold text-zinc-600 sm:w-36">City:</span>
                    <span className="min-w-0 text-zinc-800">{displayActivity.city || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    {DetailIcons.users}
                    <span className="w-[7.25rem] shrink-0 text-sm font-semibold text-zinc-600 sm:w-36">Who Can Join:</span>
                    <span className="min-w-0 text-zinc-800">
                      {displayActivity.capacity != null && displayActivity.capacity > 0
                        ? `Up to ${displayActivity.capacity} volunteer${displayActivity.capacity !== 1 ? "s" : ""}`
                        : "All Are Welcome"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    {DetailIcons.location}
                    <span className="w-[7.25rem] shrink-0 text-sm font-semibold text-zinc-600 sm:w-36">Location:</span>
                    <span className="min-w-0 text-zinc-800">
                      {[displayActivity.locationName, displayActivity.address].filter(Boolean).join(displayActivity.locationName && displayActivity.address ? " · " : "") || "—"}
                    </span>
                  </div>
                </div>
              </div>
              {/* Right (desktop) / Top (mobile): image - fixed space as before; object-contain so full image fits */}
              <div className="order-first relative aspect-video w-full shrink-0 overflow-hidden rounded-lg border-2 border-stone-200 bg-zinc-100 md:order-2 md:sticky md:top-4">
                <NextImage
                  src={displayActivity.imageUrl ?? "/swami-circle.jpeg"}
                  alt={displayActivity.title}
                  fill
                  className="object-contain object-center"
                  sizes="(max-width: 768px) 100vw, 320px"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Sign Up to Volunteer - heading (scroll target from Seva Details link) */}
        <h2 id="sign-up-to-volunteer" className="scroll-mt-6 mt-14 text-center text-2xl font-bold tracking-tight text-indigo-900">
          Sign Up to Volunteer
        </h2>

        {/* Form container - light green background */}
        <div className="mx-auto mt-6 max-w-md rounded-lg bg-emerald-50/90 px-6 py-8 shadow-sm">
          {!canJoinSeva ? (
            <p className="text-center text-zinc-600">
              No activities available to sign up yet. Add activities from the admin &quot;Add Seva Activity&quot; page, then return here to join.
            </p>
          ) : signUpSubmitted ? (
            <div className="space-y-3 text-center text-emerald-800">
              {signUpPending ? (
                <>
                  <p className="font-medium">Sai Ram!</p>
                  <p>Your registration is pending.</p>
                  <p className="text-left text-sm leading-relaxed">
                    We have informed the Seva coordinator. The Seva coordinator will inform you by email or phone if there is any availability.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Sai Ram!</p>
                  <p>Your Seva registration is confirmed.</p>
                  <p>Thank you for offering your time in selfless service.</p>
                  <p>Please check your email for further details.</p>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleJoinSeva} className="space-y-5">
              {signUpInfo && (
                <p className="rounded bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">{signUpInfo}</p>
              )}
              {signUpError && (
                <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{signUpError}</p>
              )}
              <div>
                <label htmlFor="vol-name" className="block text-sm font-semibold text-emerald-800">
                  Name <span className="text-red-600" aria-label="required">*</span>
                </label>
                <input
                  id="vol-name"
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="Full Name"
                  required
                  className="mt-1 w-full rounded border border-indigo-200 bg-white px-4 py-3 text-zinc-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="vol-email" className="block text-sm font-semibold text-emerald-800">
                  Email <span className="text-red-600" aria-label="required">*</span>
                </label>
                <input
                  id="vol-email"
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="mt-1 w-full rounded border border-indigo-200 bg-white px-4 py-3 text-zinc-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="vol-phone" className="block text-sm font-semibold text-emerald-800">
                  Phone number <span className="font-normal text-zinc-500">(optional)</span>
                </label>
                <input
                  id="vol-phone"
                  type="tel"
                  value={signUpPhone}
                  onChange={(e) => setSignUpPhone(e.target.value)}
                  placeholder="Phone"
                  className="mt-1 w-full rounded border border-indigo-200 bg-white px-4 py-3 text-zinc-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  aria-describedby="agree-terms-desc"
                />
                <label id="agree-terms-desc" htmlFor="agree-terms" className="text-sm font-medium text-zinc-800">
                  By selecting this option, I confirm that I have read, understood, and agree to the{" "}
                  <a
                    href="/Service_Activities_Waiver_of_Liability.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-indigo-600 underline hover:text-indigo-700"
                  >
                    Terms and Policy
                  </a>.
                </label>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={signUpSubmitting || !canJoinSeva || !agreedToTerms}
                  className="w-full rounded-lg bg-blue-600 py-3 text-base font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
                >
                  {signUpSubmitting ? "Submitting…" : "Join Seva"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer text */}
        <p className="mt-8 text-center text-sm font-bold text-zinc-600">
          Jai Sai Ram!
        </p>
      </div>
    </div>
  );
}

export default function SevaActivitiesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><p className="text-zinc-600">Loading…</p></div>}>
      <SevaActivitiesContent />
    </Suspense>
  );
}
