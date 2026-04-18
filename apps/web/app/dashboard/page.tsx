"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { certificatePathFromLoggedHoursRow } from "@/lib/logHoursCertificate";

type UpcomingActivity = {
  id: string;
  signupId: string;
  title: string;
  startDate: string | null;
  city?: string;
};

const CARD_COLORS = [
  "bg-indigo-800",   // dark blue/purple
  "bg-amber-700",    // brown/orange
  "bg-rose-800",     // darker brown/red
  "bg-emerald-800",  // dark green
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const [totalHoursServed, setTotalHoursServed] = useState(0);
  const [totalSevaActivities, setTotalSevaActivities] = useState(0);
  const [upcoming, setUpcoming] = useState<UpcomingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [signupModalSignupId, setSignupModalSignupId] = useState<string | null>(null);

  type LogHoursListRow = {
    id: string;
    volunteerName: string;
    location: string | null;
    activityCategory: string;
    hours: number;
    date: string;
    comments: string | null;
  };
  const [loggedHoursList, setLoggedHoursList] = useState<LogHoursListRow[]>([]);
  const [loggedHoursLoading, setLoggedHoursLoading] = useState(true);
  const [loggedHoursError, setLoggedHoursError] = useState<string | null>(null);

  // My Seva Dashboard: show "To view this you should login" when not signed in
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        setAuthChecked(true);
        setIsLoggedIn(!!data?.user);
      })
      .catch(() => {
        if (!cancelled) {
          setAuthChecked(true);
          setIsLoggedIn(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    const emailParam = searchParams.get("email")?.trim() || null;
    async function load() {
      try {
        const url = emailParam
          ? `/api/dashboard/stats?email=${encodeURIComponent(emailParam)}`
          : "/api/dashboard/stats";
        const res = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setTotalHoursServed(data.totalHoursServed ?? 0);
          setTotalSevaActivities(data.totalSevaActivities ?? 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [authChecked, searchParams]);

  const emailParam = searchParams.get("email")?.trim() || null;
  const loadUpcoming = useCallback(async (bustCache = false) => {
    const base = emailParam
      ? `/api/dashboard/upcoming?email=${encodeURIComponent(emailParam)}`
      : "/api/dashboard/upcoming";
    const url = bustCache ? `${base}${emailParam ? "&" : "?"}_t=${Date.now()}` : base;
    const res = await fetch(url, { cache: "no-store", credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data)) return;
    const seen = new Set<string>();
    const deduped = data.filter((a: UpcomingActivity & { signupId?: string }) => {
      if (!a?.id || seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
    setUpcoming(deduped);
  }, [emailParam]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    setUpcomingLoading(true);
    loadUpcoming().finally(() => {
      if (!cancelled) setUpcomingLoading(false);
    });
    return () => { cancelled = true; };
  }, [authChecked, loadUpcoming]);

  useEffect(() => {
    if (!authChecked || !isLoggedIn) return;
    let cancelled = false;
    setLoggedHoursLoading(true);
    setLoggedHoursError(null);
    fetch("/api/log-hours?limit=25", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) {
            setLoggedHoursList([]);
            setLoggedHoursError(
              res.status === 401
                ? "Could not verify your session for log history."
                : "Could not load your log history. Try refreshing the page."
            );
          }
          return null;
        }
        return res.json() as Promise<{ entries?: LogHoursListRow[] }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setLoggedHoursList(Array.isArray(data.entries) ? data.entries : []);
      })
      .catch(() => {
        if (!cancelled) {
          setLoggedHoursList([]);
          setLoggedHoursError("Could not load your log history.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoggedHoursLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authChecked, isLoggedIn]);

  if (!authChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[#FFF2A8]">
        <p className="text-zinc-600">Loading…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 bg-[#FFF2A8] px-4">
        <p className="text-center text-xl font-semibold text-zinc-800">To view this you should login.</p>
        <Link
          href="/login"
          className="rounded-full bg-[linear-gradient(180deg,#6d28d9,#b91c1c)] px-6 py-3 text-lg font-extrabold tracking-wide text-white shadow-lg transition-colors hover:opacity-90"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FFF2A8]">
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        
        {/* Top image - Love All Serve All */}
        <div className="flex justify-center">
          <div className="relative h-[130px] w-[200px] md:h-[160px] md:w-[240px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/love-all-serve-all.jpg"
              alt="Love All Serve All"
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        {/* Welcome */}
        <h1 className="mt-4 text-center text-3xl font-extrabold tracking-widest text-indigo-800 md:text-5xl">
          WELCOME BACK!
        </h1>

        {/* Stats cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 md:gap-10">
          <StatCard
            value={loading ? "…" : totalHoursServed}
            label="Total Hours Served"
          />
          <StatCard
            value={loading ? "…" : totalSevaActivities}
            label="Total Seva Activities"
          />
        </div>

        {/* GET /api/log-hours uses session email only — each user sees only their own rows */}
        <div
          id="dashboard-your-logged-hours"
          className="mx-auto mt-10 max-w-4xl scroll-mt-24 rounded-xl border-2 border-indigo-300/80 bg-white/60 px-4 py-8 shadow-md md:px-6"
        >
          <h2 className="text-center text-2xl font-extrabold text-indigo-800 md:text-3xl">
            Your Log Hours history
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-zinc-800">
            This grid lists <strong>only your</strong> submissions from the{" "}
            <Link href="/log-hours" className="font-semibold text-indigo-800 underline">
              Log Hours
            </Link>{" "}
            page while signed in as <strong>this account</strong> (filtered by your email in the database). Other people’s hours never appear here. This is separate from{" "}
            <strong>Upcoming Seva Activities</strong> below, which shows activities you joined.
          </p>
          {loggedHoursLoading ? (
            <div className="mx-auto mt-6 h-24 max-w-2xl animate-pulse rounded-lg bg-indigo-200/50" />
          ) : loggedHoursError ? (
            <div className="mx-auto mt-6 rounded-md bg-red-50 px-6 py-4 text-center text-sm text-red-900 shadow-sm">
              {loggedHoursError}
            </div>
          ) : loggedHoursList.length === 0 ? (
            <div className="mx-auto mt-6 rounded-md bg-amber-50/90 px-6 py-6 text-center text-zinc-800 shadow-sm ring-1 ring-amber-200">
              No Log Hours rows yet for <strong>this</strong> account. Use the <strong>Log Hours</strong> button below, submit while signed in, and rows will appear here with{" "}
              <strong>View certificate</strong>.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-lg border border-indigo-200/60 bg-white/50 shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm text-zinc-800">
                <thead>
                  <tr className="border-b border-indigo-200/80 bg-indigo-50/90 text-xs font-bold uppercase tracking-wide text-indigo-900">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3 text-right">Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {loggedHoursList.map((row) => {
                    const d = new Date(row.date);
                    const dateLabel = Number.isNaN(d.getTime())
                      ? "—"
                      : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
                    return (
                      <tr key={row.id} className="border-b border-indigo-100/80 last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 font-medium">{dateLabel}</td>
                        <td className="px-4 py-3">{row.activityCategory}</td>
                        <td className="whitespace-nowrap px-4 py-3">{row.hours}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={certificatePathFromLoggedHoursRow({
                              volunteerName: row.volunteerName,
                              location: row.location,
                              activityCategory: row.activityCategory,
                              hours: row.hours,
                              date: row.date,
                              comments: row.comments,
                            })}
                            className="inline-block rounded-full bg-emerald-800 px-4 py-2 text-xs font-bold tracking-wide text-white shadow hover:bg-emerald-900"
                          >
                            View certificate
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Log Hours button - same style as Home page */}
        <div className="mt-10 flex justify-center">
          <Link
            href="/log-hours"
            className="rounded-full bg-[linear-gradient(180deg,#6d28d9,#b91c1c)] px-6 py-4 text-xl font-extrabold tracking-[0.15em] text-white shadow-[0_18px_30px_rgba(0,0,0,0.25)] [text-shadow:0_1px_2px_rgba(0,0,0,0.4)] transition-colors hover:[background:#059669] sm:px-8 sm:py-4 sm:text-2xl sm:tracking-[0.18em] md:px-12 md:py-5 md:text-3xl md:tracking-[0.20em] lg:px-16 lg:py-6 lg:text-4xl"
          >
            Log Hours <span className="ml-2 inline-block text-2xl leading-none sm:ml-3 sm:text-3xl md:text-4xl lg:text-5xl">❣</span>
          </Link>
        </div>

        {/* Upcoming Seva Activities */}
        <div className="mt-10 text-center">
          <h2 className="text-2xl font-extrabold text-indigo-800 md:text-3xl">
            Upcoming Seva Activities
          </h2>

          {upcomingLoading ? (
            <div className="mx-auto mt-6 flex justify-center gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[140px] w-full max-w-[200px] animate-pulse rounded-lg bg-indigo-200/60"
                />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="mx-auto mt-4 max-w-3xl rounded-md bg-white/35 px-6 py-8 text-zinc-700 shadow-sm">
              No upcoming activities yet.
            </div>
          ) : (
            <div className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {upcoming.map((activity, index) => (
                <UpcomingCard
                  key={activity.id}
                  activity={activity}
                  colorClass={CARD_COLORS[index % CARD_COLORS.length]}
                  onClick={() => activity.signupId && setSignupModalSignupId(activity.signupId)}
                />
              ))}
            </div>
          )}

          {signupModalSignupId && (
            <UpcomingSignupModal
              signupId={signupModalSignupId}
              onClose={() => setSignupModalSignupId(null)}
              onSaved={(withdrawnSignupId?: string) => {
                setSignupModalSignupId(null);
                if (withdrawnSignupId) {
                  setUpcoming((prev) => prev.filter((a) => a.signupId !== withdrawnSignupId));
                }
                loadUpcoming(true);
              }}
            />
          )}
        </div>
      </section>
    </div>
  );
}

export default function MyDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FFF2A8]">
          <p className="text-zinc-600">Loading…</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function StatCard({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[460px] bg-emerald-900 px-6 py-10 text-center shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
      <div className="text-6xl font-extrabold text-lime-200 md:text-7xl">
        {value}
      </div>
      <div className="mt-4 text-xl font-extrabold text-white md:text-2xl">
        {label}
      </div>
    </div>
  );
}

function formatActivityDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBD";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function UpcomingCard({
  activity,
  colorClass,
  onClick,
}: {
  activity: UpcomingActivity;
  colorClass: string;
  onClick: () => void;
}) {
  const dateStr = formatActivityDate(activity.startDate);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group block min-h-[140px] w-full overflow-hidden rounded-lg ${colorClass} px-4 py-6 text-center shadow-lg transition-transform duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 group-hover:-translate-y-2 group-hover:scale-[1.02]`}
    >
      <div className="flex min-h-full flex-col items-center justify-center">
        <span className="text-lg font-bold text-white drop-shadow-sm md:text-xl">
          {activity.title}
        </span>
        <span className="mt-2 text-sm font-semibold text-white/95 drop-shadow-sm md:text-base">
          {dateStr}
        </span>
      </div>
    </button>
  );
}

type SignupForModal = {
  id: string;
  comment: string | null;
  activity: { id: string; title: string; startDate: string | null; city: string | null };
};

function UpcomingSignupModal({
  signupId,
  onClose,
  onSaved,
}: {
  signupId: string;
  onClose: () => void;
  onSaved: (withdrawnSignupId?: string) => void;
}) {
  const [signup, setSignup] = useState<SignupForModal | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/seva-signups/${signupId}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 401 ? "Please log in" : "Failed to load");
        return res.json();
      })
      .then((data: SignupForModal) => {
        if (!cancelled) {
          setSignup(data);
          setComment(data.comment ?? "");
        }
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [signupId]);

  async function handleSaveComment() {
    if (!signupId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/seva-signups/${signupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comment: comment.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to save");
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleWithdraw() {
    if (!signupId || !confirm("Are you sure you want to withdraw from this activity? You can sign up again later from Find Seva.")) return;
    setWithdrawing(true);
    setError(null);
    try {
      const res = await fetch(`/api/seva-signups/${signupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to withdraw");
      }
      onSaved(signupId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to withdraw");
    } finally {
      setWithdrawing(false);
    }
  }

  const dateStr = signup?.activity?.startDate
    ? formatActivityDate(signup.activity.startDate)
    : "Date TBD";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" aria-modal="true" role="dialog">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
          <h3 className="text-lg font-bold text-zinc-800">Your sign-up</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4">
          {loading ? (
            <p className="text-zinc-600">Loading…</p>
          ) : error && !signup ? (
            <p className="text-red-600">{error}</p>
          ) : signup ? (
            <>
              <p className="font-semibold text-zinc-800">{signup.activity?.title}</p>
              <p className="mt-1 text-sm text-zinc-600">{dateStr}</p>
              <div className="mt-4">
                <label htmlFor="upcoming-signup-comment" className="block text-sm font-medium text-zinc-700">
                  Comment (optional)
                </label>
                <textarea
                  id="upcoming-signup-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Add a note for the coordinator…"
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveComment}
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save comment"}
                </button>
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                  className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {withdrawing ? "Withdrawing…" : "Withdraw from activity"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Close
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}