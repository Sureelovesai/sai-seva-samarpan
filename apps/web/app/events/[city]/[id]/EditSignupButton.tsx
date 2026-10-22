"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  GUEST_CAP,
  ZERO_PARTY_MESSAGE,
  guestDraftToApiCount,
  isZeroParty,
  sanitizeGuestCountDraft,
  type RsvpResponse,
} from "./guestCounts";

const inputClass =
  "mt-1 w-full rounded-xl border-2 border-fuchsia-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300";
const primaryButtonClass =
  "rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-300/50 transition hover:from-fuchsia-700 hover:to-violet-700 disabled:opacity-50";
const secondaryButtonClass =
  "rounded-xl border-2 border-fuchsia-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-fuchsia-300 hover:bg-fuchsia-50 disabled:opacity-50";

export function EditSignupButton({
  eventId,
  signupId,
  participantName,
}: {
  eventId: string;
  signupId: string;
  participantName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"email" | "edit">("email");
  const [email, setEmail] = useState("");
  const [response, setResponse] = useState<RsvpResponse>("YES");
  const [adultsDraft, setAdultsDraft] = useState("0");
  const [kidsDraft, setKidsDraft] = useState("0");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = `/api/portal-events/${encodeURIComponent(eventId)}/signup`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  function openDialog() {
    setStep("email");
    setEmail("");
    setError(null);
    setOpen(true);
  }

  async function verifyEmail(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Enter the email you signed up with.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupId, email: em, verifyOnly: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not verify your email.");
      setResponse(data.response === "NO" || data.response === "MAYBE" ? data.response : "YES");
      setAdultsDraft(String(Math.max(0, Number(data.accompanyingAdults) || 0)));
      setKidsDraft(String(Math.max(0, Number(data.accompanyingKids) || 0)));
      setComment(typeof data.comment === "string" ? data.comment : "");
      setStep("edit");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not verify your email.");
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const accompanyingAdults = guestDraftToApiCount(adultsDraft);
    const accompanyingKids = guestDraftToApiCount(kidsDraft);
    if (isZeroParty(response, accompanyingAdults, accompanyingKids)) {
      setError(ZERO_PARTY_MESSAGE);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupId,
          email: email.trim().toLowerCase(),
          response,
          accompanyingAdults,
          accompanyingKids,
          comment: comment.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save your changes.");
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not save your changes.");
    } finally {
      setBusy(false);
    }
  }

  function countInput(id: string, label: string, value: string, setValue: (v: string) => void) {
    return (
      <div className="flex-1">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          type="number"
          min={0}
          max={GUEST_CAP}
          step={1}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value === "" ? "" : sanitizeGuestCountDraft(e.target.value))}
          onBlur={() => setValue(value.trim() === "" ? "0" : sanitizeGuestCountDraft(value))}
          className={`${inputClass} [appearance:auto]`}
        />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label={`Edit sign-up for ${participantName}`}
        className="text-xs font-semibold text-violet-700 underline underline-offset-2 hover:text-violet-800"
      >
        Edit
      </button>

      {open ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`edit-signup-title-${signupId}`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-fuchsia-200 bg-white p-6 text-left shadow-xl">
            <h3 id={`edit-signup-title-${signupId}`} className="text-lg font-bold text-slate-900">
              Edit sign-up for {participantName}
            </h3>

            {step === "email" ? (
              <form onSubmit={verifyEmail} className="mt-3 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900" htmlFor={`edit-email-${signupId}`}>
                    Email you signed up with
                  </label>
                  <input
                    id={`edit-email-${signupId}`}
                    type="email"
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={busy} className={primaryButtonClass}>
                    {busy ? "Checking…" : "Continue"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setOpen(false)} className={secondaryButtonClass}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={save} className="mt-3 space-y-4">
                <div>
                  <span className="block text-sm font-semibold text-slate-900">Will you attend?</span>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    {(["YES", "MAYBE", "NO"] as const).map((r) => (
                      <label key={r} className="inline-flex items-center gap-2 font-medium text-slate-800">
                        <input
                          type="radio"
                          name={`edit-response-${signupId}`}
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
                <div>
                  <p className="text-xs text-slate-600">Count adults and kids in your full group (including yourself).</p>
                  <div className="mt-2 flex gap-4">
                    {countInput(`edit-adults-${signupId}`, "Adults", adultsDraft, setAdultsDraft)}
                    {countInput(`edit-kids-${signupId}`, "Kids", kidsDraft, setKidsDraft)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900" htmlFor={`edit-comment-${signupId}`}>
                    Comments or notes
                  </label>
                  <textarea
                    id={`edit-comment-${signupId}`}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className={inputClass}
                  />
                  <p className="mt-1 text-right text-xs text-slate-500">{comment.length}/500</p>
                </div>
                {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={busy} className={primaryButtonClass}>
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setOpen(false)} className={secondaryButtonClass}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
