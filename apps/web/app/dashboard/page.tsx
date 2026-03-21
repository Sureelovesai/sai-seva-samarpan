"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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
      .catch((e: Error) => {
        if (!cancelled) setError(e.message ?? "Failed to load");
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
    } catch (e: Error) {
      setError(e.message ?? "Failed to save");
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
    } catch (e: Error) {
      setError(e.message ?? "Failed to withdraw");
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