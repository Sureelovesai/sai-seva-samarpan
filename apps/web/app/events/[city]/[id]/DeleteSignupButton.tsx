"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";

export function DeleteSignupButton({
  eventId,
  signupId,
  participantName,
  signupEmail,
}: {
  eventId: string;
  signupId: string;
  participantName: string;
  signupEmail: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const endpoint = `/api/portal-events/${encodeURIComponent(eventId)}/signup`;

  async function deleteSignup() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not delete sign-up.");
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not delete sign-up.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete sign-up for ${participantName}`}
        className="text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-800"
      >
        Delete
      </button>

      {open ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-signup-title-${signupId}`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border-2 border-red-200 bg-white p-6 shadow-xl">
            {!emailVerified ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const em = userEmail.trim().toLowerCase();
                  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
                    setError("Enter a valid email address.");
                    return;
                  }
                  if (em !== signupEmail.toLowerCase()) {
                    setError("This email does not match the sign-up. Only the person who created this sign-up can delete it.");
                    return;
                  }
                  setEmailVerified(true);
                  setError(null);
                }}
                className="space-y-4"
              >
                <h3 id={`delete-signup-title-${signupId}`} className="text-lg font-bold text-slate-900">
                  Delete sign-up for {participantName}?
                </h3>
                <p className="text-sm text-slate-700">
                  To delete this sign-up, please enter the email address it was created with.
                </p>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => {
                    setUserEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your email"
                  className="w-full rounded-lg border-2 border-red-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-300"
                  autoFocus
                />
                {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setOpen(false);
                      setEmailVerified(false);
                      setUserEmail("");
                      setError(null);
                    }}
                    className="rounded-xl border-2 border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h3 id={`delete-signup-title-${signupId}`} className="text-lg font-bold text-slate-900">
                  Delete sign-up for {participantName}?
                </h3>
                <p className="mt-3 text-sm text-slate-700">
                  This will remove the sign-up response for <strong>{participantName}</strong>. This action cannot be undone.
                </p>
                {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={deleteSignup}
                    className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {busy ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setOpen(false);
                      setEmailVerified(false);
                      setUserEmail("");
                      setError(null);
                    }}
                    className="rounded-xl border-2 border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
