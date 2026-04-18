"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/cities";
import { certificatePathFromLoggedHoursRow } from "@/lib/logHoursCertificate";

export default function LogHoursPage() {
  const router = useRouter();

  const [activity, setActivity] = useState("");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState("");
  const [comments, setComments] = useState("");

  // NEW: certificate needs volunteer name + location (city)
  const [volunteerName, setVolunteerName] = useState("");
  const [location, setLocation] = useState("");

  // Logged-in user email: sent with submission so My Seva Dashboard can count these hours
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        const user = data?.user;
        const email = user?.email;
        setUserEmail(email ? String(email).trim().toLowerCase() : null);

        // Auto-populate Volunteer Name and Location from registered user (only when fields are empty)
        if (user) {
          setVolunteerName((prev) => {
            if (prev.trim()) return prev;
            const name =
              (user.name && String(user.name).trim()) ||
              [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
            return name || prev;
          });
          setLocation((prev) => {
            if (prev.trim()) return prev;
            const loc = user.location && String(user.location).trim();
            if (!loc) return prev;
            const locLower = loc.toLowerCase();
            const match =
              CITIES.find((c) => c.toLowerCase() === locLower) ||
              CITIES.find((c) => locLower.startsWith(c.toLowerCase() + ",")) ||
              CITIES.find((c) => locLower.startsWith(c.toLowerCase() + " "));
            return match || prev;
          });
        }
      })
      .catch(() => setUserEmail(null));
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  /** Saved rows for this login (so certificate works after leaving and coming back). */
  type SavedLogEntry = {
    id: string;
    volunteerName: string;
    location: string | null;
    activityCategory: string;
    hours: number;
    date: string;
    comments: string | null;
  };
  const [savedEntries, setSavedEntries] = useState<SavedLogEntry[]>([]);

  const loadSavedEntries = () => {
    fetch("/api/log-hours?limit=10", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { entries?: SavedLogEntry[] } | null) => {
        if (data?.entries) setSavedEntries(data.entries);
      })
      .catch(() => setSavedEntries([]));
  };

  useEffect(() => {
    loadSavedEntries();
  }, []);

  const submitSuccess = submitMsg?.kind === "ok";
  const latestSaved = savedEntries[0];

  /** Current submission on the page, or any past submission from the server when returning later. */
  const canViewCertificate = submitSuccess || Boolean(latestSaved);

  const todayYyyyMmDd = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const formValid = useMemo(() => {
    const h = parseFloat(hours);
    const hasHours = hours.trim().length > 0 && Number.isFinite(h) && h >= 0;
    const dateNotFuture = date.trim().length > 0 && date <= todayYyyyMmDd;
    return (
      volunteerName.trim().length > 0 &&
      location.trim().length > 0 &&
      activity.trim().length > 0 &&
      hasHours &&
      dateNotFuture
    );
  }, [volunteerName, location, activity, hours, date, todayYyyyMmDd]);

  // Submit enabled only when form is valid and we're not in success state (must Clear first to submit again)
  const canSubmit = formValid && !submitSuccess;

  async function onSubmitHours() {
    if (!canSubmit) return;
    setSubmitMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/log-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteerName: volunteerName.trim(),
          email: userEmail || undefined,
          location: location.trim() || undefined,
          activityCategory: activity.trim(),
          hours: parseFloat(hours),
          date: date ? new Date(date + "T12:00:00.000Z").toISOString() : undefined,
          comments: comments.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.detail || "Submit failed.");
      setSubmitMsg({
        kind: "ok",
        text: "Sai Ram!\nYour Seva hours have been successfully recorded.\nThank you for your loving service.\n\n\"Hands that serve are holier than lips that pray.\"\n— Sri Sathya Sai Baba",
      });
      loadSavedEntries();
    } catch (e: unknown) {
      setSubmitMsg({ kind: "err", text: (e as Error)?.message || "Failed to submit hours." });
    } finally {
      setSubmitting(false);
    }
  }

  function onClear() {
    setVolunteerName("");
    setLocation("");
    setActivity("");
    setHours("");
    setDate("");
    setComments("");
    setSubmitMsg(null);
  }

  function onViewCertificate() {
    if (submitSuccess) {
      const params = new URLSearchParams();
      params.set("name", volunteerName.trim());
      params.set("activity", activity.trim());
      params.set("hours", hours.trim());
      params.set("date", date.trim());
      params.set("location", (location || "").trim());
      params.set("comments", (comments || "").trim());
      router.push(`/log-hours/certificate?${params.toString()}`);
      return;
    }
    if (latestSaved) {
      router.push(
        certificatePathFromLoggedHoursRow({
          volunteerName: latestSaved.volunteerName,
          location: latestSaved.location,
          activityCategory: latestSaved.activityCategory,
          hours: latestSaved.hours,
          date: latestSaved.date,
          comments: latestSaved.comments,
        })
      );
    }
  }

  return (
    <div className="min-h-[calc(100vh-1px)] bg-[radial-gradient(circle_at_40%_10%,rgba(255,255,255,0.7),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(120,140,90,0.75),rgba(240,220,140,0.80),rgba(120,140,90,0.75))]">
      {/* thin separator line under header */}
      <div className="h-[2px] w-full bg-black/10" />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          {/* LEFT IMAGE */}
          <div className="relative mx-auto w-full max-w-[520px] overflow-hidden bg-white/40 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
            <div className="relative aspect-[4/5] w-full">
              <Image
                src="/log-hours-swami.webp"
                alt="Swami"
                fill
                priority
                className="object-cover"
              />
            </div>
          </div>

          {/* RIGHT FORM */}
          <div className="mx-auto w-full max-w-[520px]">
            <div className="space-y-6">
              {/* NEW: Volunteer name */}
              <div>
                <div className="text-lg font-semibold text-zinc-900">
                  Volunteer Name <span className="text-red-600">*</span>
                </div>
                <input
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={submitSuccess}
                  required
                  className="mt-3 w-full rounded-none border border-zinc-500 bg-white px-5 py-4 text-zinc-800 shadow-sm outline-none disabled:bg-zinc-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Location (City) - dropdown with same cities as elsewhere */}
              <div>
                <div className="text-lg font-semibold text-zinc-900">
                  Location (City) <span className="text-red-600">*</span>
                </div>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={submitSuccess}
                  required
                  className="mt-3 w-full rounded-lg border border-zinc-500 bg-white px-5 py-4 text-zinc-800 shadow-sm outline-none disabled:bg-zinc-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500"
                >
                  <option value="">Select city</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Seva Activity - free text */}
              <div>
                <div className="text-lg font-semibold text-zinc-900">
                  Seva Activity <span className="text-red-600">*</span>
                </div>
                <input
                  type="text"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder="e.g. Food Service, Medical Camp, Teaching"
                  disabled={submitSuccess}
                  required
                  className="mt-3 w-full rounded-none border border-zinc-500 bg-white px-5 py-4 text-zinc-800 shadow-sm outline-none disabled:bg-zinc-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Enter Hours Served */}
              <div>
                <div className="text-lg font-semibold text-zinc-900">
                  Enter Hours Served <span className="text-red-600">*</span>
                </div>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g. 2 or 2.5"
                  disabled={submitSuccess}
                  required
                  className="mt-3 w-full rounded-lg border border-emerald-700/40 bg-white px-5 py-4 text-zinc-800 shadow-sm outline-none disabled:bg-zinc-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Date — label + visible "Select date" so picker is obvious on mobile; current or past only */}
              <div>
                <div className="text-lg font-semibold text-zinc-900">
                  Date of Service <span className="text-red-600">*</span>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={date}
                    max={todayYyyyMmDd}
                    onChange={(e) => setDate(e.target.value)}
                    onFocus={(e) => {
                      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    disabled={submitSuccess}
                    required
                    className="w-full min-w-0 flex-1 rounded-none border border-zinc-500 bg-white px-5 py-4 text-zinc-800 shadow-sm outline-none disabled:bg-zinc-100 disabled:cursor-not-allowed [color-scheme:light]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      dateInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      dateInputRef.current?.focus();
                      try {
                        dateInputRef.current?.showPicker?.();
                      } catch {
                        // showPicker not supported (older browsers)
                      }
                    }}
                    disabled={submitSuccess}
                    className="shrink-0 rounded-none border border-zinc-500 bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                  >
                    Select date
                  </button>
                </div>
                <p className="mt-1.5 text-sm text-zinc-600">
                  Current or past date only. Tap the field or &quot;Select date&quot; to open the calendar.
                </p>
              </div>

              {/* Comments */}
              <div>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Comments"
                  rows={3}
                  disabled={submitSuccess}
                  className="w-full resize-none rounded-none border border-zinc-500 bg-white px-5 py-4 text-zinc-800 shadow-sm outline-none disabled:bg-zinc-100 disabled:cursor-not-allowed"
                />
              </div>

              {submitMsg && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm font-semibold whitespace-pre-line ${
                    submitMsg.kind === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
                  }`}
                >
                  {submitMsg.text}
                </div>
              )}

              {/* Submit + View Certificate + Clear */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {/* Submit Hours - disabled after success until Clear */}
                  <button
                    type="button"
                    onClick={onSubmitHours}
                    disabled={!canSubmit || submitting}
                    className="flex items-center overflow-hidden rounded-none shadow-[0_10px_22px_rgba(0,0,0,0.18)] disabled:opacity-60"
                  >
                    <span className="relative h-12 w-12 bg-white">
                      <Image
                        src="/submit-icon.jpg"
                        alt="Submit"
                        fill
                        className="object-cover"
                      />
                    </span>
                    <span className={`px-10 py-3 text-base font-semibold tracking-wide text-white ${submitSuccess ? "bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"}`}>
                      {submitting ? "Submitting…" : submitSuccess ? "Submitted" : "Submit Hours"}
                    </span>
                  </button>

                  {/* View Certificate - enabled only after successful submit */}
                  <button
                    type="button"
                    onClick={onViewCertificate}
                    disabled={!canViewCertificate}
                    className="flex items-center overflow-hidden rounded-none shadow-[0_10px_22px_rgba(0,0,0,0.18)] disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      canViewCertificate
                        ? submitSuccess
                          ? "Certificate for this submission"
                          : latestSaved
                            ? "Certificate for your most recent logged hours (from My Seva Dashboard you can pick any past entry)"
                            : "View Certificate"
                        : "Log hours while signed in to generate a certificate anytime"
                    }
                  >
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center bg-amber-50">
                      <Image
                        src="/trophy.svg"
                        alt="Trophy"
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </span>
                    <span className="bg-emerald-800 px-10 py-3 text-base font-semibold tracking-wide text-white hover:bg-emerald-900 disabled:opacity-50">
                      View Certificate
                    </span>
                  </button>

                  {/* Clear - resets form so user can log again */}
                  <button
                    type="button"
                    onClick={onClear}
                    className="rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-100 to-amber-200 px-8 py-3.5 text-base font-semibold tracking-wide text-amber-900 shadow-md transition-all hover:from-amber-200 hover:to-amber-300 hover:border-amber-500 hover:shadow-lg active:scale-[0.98]"
                  >
                    Clear
                  </button>
                </div>

                {latestSaved && !submitSuccess && (
                  <p className="max-w-md text-center text-sm text-zinc-700">
                    <strong>View Certificate</strong> uses your{" "}
                    <strong>most recent</strong> saved entry. For older entries, open{" "}
                    <Link href="/dashboard" className="font-semibold text-indigo-800 underline">
                      My Seva Dashboard
                    </Link>{" "}
                    → Your logged hours.
                  </p>
                )}

                <div className="text-lg font-semibold text-zinc-800">
                  Jai Sai Ram!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* subtle bottom color strip like screenshot */}
      <div className="h-2 w-full bg-gradient-to-r from-blue-700/40 via-cyan-400/60 to-emerald-400/50" />
    </div>
  );
}
