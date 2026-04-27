"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function Req() {
  return (
    <span className="ml-0.5 font-normal text-red-600" aria-hidden>
      *
    </span>
  );
}

export function EventRsvpForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [accompanyingAdults, setAccompanyingAdults] = useState(0);
  const [accompanyingKids, setAccompanyingKids] = useState(0);
  const [response, setResponse] = useState<"YES" | "NO" | "MAYBE">("YES");
  const [submitting, setSubmitting] = useState(false);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function loadPreviousByEmail() {
    const em = email.trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Enter a valid email first, then click Load previous response.");
      return;
    }
    setError(null);
    setInfo(null);
    setLoadingPrevious(true);
    try {
      const res = await fetch(
        `/api/portal-events/${encodeURIComponent(eventId)}/signup?email=${encodeURIComponent(em)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          setInfo("No previous response found for this email on this event.");
          return;
        }
        throw new Error(data?.error || "Could not load previous response.");
      }
      setFirstName(typeof data.firstName === "string" ? data.firstName : "");
      setLastName(typeof data.lastName === "string" ? data.lastName : "");
      setEmail(typeof data.email === "string" ? data.email : em);
      setResponse(data.response === "NO" || data.response === "MAYBE" ? data.response : "YES");
      setAccompanyingAdults(
        Number.isFinite(Number(data.accompanyingAdults)) ? Math.max(0, Number(data.accompanyingAdults)) : 0
      );
      setAccompanyingKids(
        Number.isFinite(Number(data.accompanyingKids)) ? Math.max(0, Number(data.accompanyingKids)) : 0
      );
      setComment(typeof data.comment === "string" ? data.comment : "");
      setInfo("Previous response loaded. Update fields and submit to save changes.");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not load previous response.");
    } finally {
      setLoadingPrevious(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setInfo(null);
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      setError("First name and last name are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal-events/${encodeURIComponent(eventId)}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fn,
          lastName: ln,
          email,
          comment: comment.trim() || undefined,
          accompanyingAdults,
          accompanyingKids,
          response,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not submit");
      setMessage(typeof data.message === "string" ? data.message : "Thank you!");
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="events-form-surface space-y-5 p-5">
      <p className="text-xs text-slate-600">
        <span className="font-semibold text-red-600">*</span> marks required fields. Other fields are optional.
      </p>

      <div>
        <span className="block text-sm font-semibold text-slate-900">
          Will you attend?
          <Req />
        </span>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {(["YES", "MAYBE", "NO"] as const).map((r) => (
            <label key={r} className="inline-flex items-center gap-2 font-medium text-slate-800">
              <input
                type="radio"
                name="response"
                value={r}
                checked={response === r}
                onChange={() => setResponse(r)}
                className="h-4 w-4"
              />
              {r === "YES" ? "Yes" : r === "NO" ? "No" : "Maybe"}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-slate-900" htmlFor="evt-first-name">
            First name
            <Req />
          </label>
          <input
            id="evt-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            maxLength={100}
            autoComplete="given-name"
            className="mt-1 w-full rounded-xl border-2 border-fuchsia-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900" htmlFor="evt-last-name">
            Last name
            <Req />
          </label>
          <input
            id="evt-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            maxLength={100}
            autoComplete="family-name"
            className="mt-1 w-full rounded-xl border-2 border-fuchsia-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900" htmlFor="evt-email">
          Email
          <Req />
        </label>
        <input
          id="evt-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="mt-1 w-full rounded-xl border-2 border-fuchsia-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300"
        />
        <button
          type="button"
          onClick={loadPreviousByEmail}
          disabled={loadingPrevious || submitting}
          className="mt-2 text-xs font-semibold text-violet-700 underline underline-offset-2 hover:text-violet-800 disabled:opacity-50"
        >
          {loadingPrevious ? "Loading previous response…" : "Load my previous response"}
        </button>
      </div>

      <div>
        <span className="block text-sm font-semibold text-slate-900">Guests accompanying you</span>
        <p className="mt-0.5 text-xs text-slate-600">
          Count adults and kids in your full group (including yourself).
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:gap-6">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700" htmlFor="evt-adults">
              Adults
            </label>
            <input
              id="evt-adults"
              type="number"
              min={0}
              max={500}
              value={accompanyingAdults}
              onChange={(e) => setAccompanyingAdults(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="mt-1 w-full max-w-[11rem] rounded-xl border-2 border-fuchsia-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300 sm:max-w-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700" htmlFor="evt-kids">
              Kids
            </label>
            <input
              id="evt-kids"
              type="number"
              min={0}
              max={500}
              value={accompanyingKids}
              onChange={(e) => setAccompanyingKids(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="mt-1 w-full max-w-[11rem] rounded-xl border-2 border-fuchsia-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300 sm:max-w-none"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900" htmlFor="evt-comment">
          Comments or notes
        </label>
        <p className="mt-0.5 text-xs text-slate-600">
          Dietary needs, accessibility, or other notes for organizers (shown on the attendance list).
        </p>
        <textarea
          id="evt-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-xl border-2 border-fuchsia-200/80 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300"
        />
        <p className="mt-1 text-right text-xs text-slate-500">{comment.length}/500</p>
      </div>

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {info ? <p className="text-sm font-medium text-sky-800">{info}</p> : null}
      {message ? (
        <p className="text-sm font-bold text-emerald-800">
          {message} Need to edit your response? Update any field and submit again.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-300/50 transition hover:from-fuchsia-700 hover:to-violet-700 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit response"}
      </button>
    </form>
  );
}
