"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setMessage({ type: "error", text: "Please enter your email address." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = data?.error ?? "Something went wrong. Please try again.";
        const detail = data?.detail && typeof data.detail === "string" ? data.detail : null;
        setMessage({ type: "error", text: detail ? `${errMsg} ${detail}` : errMsg });
        return;
      }
      setMessage({
        type: "success",
        text: data?.message ?? "If an account exists with this email, you will receive a password reset link.",
      });
      setEmail("");
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-1px)] flex flex-col items-center justify-center px-4 py-12 bg-slate-200">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot password</h1>
          <p className="mt-1 text-slate-700 text-sm">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 transition"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
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
