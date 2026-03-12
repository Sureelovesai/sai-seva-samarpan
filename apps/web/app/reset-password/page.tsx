"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!tokenFromUrl) {
      setMessage({ type: "error", text: "Reset link is invalid. Please request a new one from the forgot password page." });
      return;
    }
    if (password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenFromUrl, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? "Something went wrong. Please try again." });
        return;
      }
      setMessage({
        type: "success",
        text: data?.message ?? "Your password has been reset. You can now log in.",
      });
      setPassword("");
      setConfirm("");
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (!tokenFromUrl) {
    return (
      <div className="min-h-[calc(100vh-1px)] flex flex-col items-center justify-center px-4 py-12 bg-slate-200">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 p-6 sm:p-8">
            <h1 className="text-xl font-bold text-slate-900">Invalid reset link</h1>
            <p className="mt-2 text-slate-700 text-sm">
              This link is missing a token. Please use the link from your email, or request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-block font-semibold text-indigo-700 hover:text-indigo-800 underline underline-offset-2"
            >
              Request a new reset link
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-800">
            <Link href="/login" className="font-semibold text-indigo-700 hover:text-indigo-800 underline underline-offset-2">
              ← Back to log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-1px)] flex flex-col items-center justify-center px-4 py-12 bg-slate-200">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Set new password</h1>
          <p className="mt-1 text-slate-700 text-sm">Enter your new password below.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden">
          <div className="p-6 sm:p-8">
            {message && (
              <div
                className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {message.text}
              </div>
            )}

            {message?.type === "success" ? (
              <Link
                href="/login"
                className="block w-full rounded-xl bg-indigo-600 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
              >
                Go to log in
              </Link>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="reset-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    New password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">At least 8 characters</p>
                </div>
                <div>
                  <label htmlFor="reset-confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm new password
                  </label>
                  <input
                    id="reset-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 transition"
                >
                  {loading ? "Resetting…" : "Reset password"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-800">
          <Link
            href="/login"
            className="font-semibold text-indigo-700 hover:text-indigo-800 underline underline-offset-2"
          >
            ← Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-1px)] flex items-center justify-center bg-slate-200">
          <p className="text-slate-600">Loading…</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
