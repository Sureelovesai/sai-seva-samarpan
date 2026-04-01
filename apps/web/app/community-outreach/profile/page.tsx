"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CITIES } from "@/lib/cities";

export default function CommunityOutreachProfilePage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/community-outreach/me", { credentials: "include" })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok && (data?.errorCode === "DATABASE_ERROR" || r.status >= 500)) {
          setLoadError(
            typeof data?.message === "string"
              ? data.message
              : "The server could not load your profile. The database may be unavailable or migrations may be missing."
          );
          setLoading(false);
          return;
        }
        if (!data?.user) {
          setForbidden(true);
          setLoading(false);
          return;
        }
        const p = data.profile;
        if (p?.status === "APPROVED") {
          setProfileStatus("APPROVED");
          setOrganizationName(p.organizationName || "");
          setCity(p.city || "");
        } else if (p) {
          setOrganizationName(p.organizationName || "");
          setCity(p.city || "");
          setDescription(p.description || "");
          setContactPhone(p.contactPhone || "");
          setWebsite(p.website || "");
          setProfileStatus(p.status);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoadError("Could not reach the server. Check your connection and try again.");
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/community-outreach/profile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName,
          city,
          description,
          contactPhone,
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setMsg({
        kind: "ok",
        text: "Profile submitted. Our review team and your regional seva coordinator (if assigned) have been notified.",
      });
      setProfileStatus("PENDING");
    } catch (err: unknown) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-zinc-50 text-zinc-600">
        Loading…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-semibold text-zinc-900">Something went wrong loading your profile</p>
        <p className="mt-3 text-sm text-zinc-600">{loadError}</p>
        <p className="mt-4 text-sm text-zinc-500">
          If you are already logged in, this is usually a database or deployment issue—not missing sign-in.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-block rounded-full bg-zinc-800 px-6 py-2 font-semibold text-white hover:bg-zinc-900"
        >
          Retry
        </button>
        <p className="mt-4 text-sm">
          <Link href="/community-outreach" className="text-blue-700 underline">
            ← Community Outreach steps
          </Link>
        </p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg text-zinc-800">Sign in to complete your organization profile.</p>
        <Link
          href="/login?next=/community-outreach/profile"
          className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
        >
          Log in or sign up
        </Link>
      </div>
    );
  }

  if (profileStatus === "APPROVED") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-semibold text-zinc-900">Your organization is approved</p>
        <p className="mt-2 text-zinc-600">
          <strong>{organizationName}</strong> · {city}
        </p>
        <Link
          href="/community-outreach/post-activity"
          className="mt-8 inline-block rounded-full bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Post a service activity
        </Link>
        <p className="mt-6 text-sm text-zinc-500">
          <Link href="/community-outreach" className="text-blue-700 underline">
            Back to Community Outreach
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-xl px-4">
        <h1 className="text-2xl font-bold text-zinc-900">Organization profile</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Our review team will review your submission. Admins and the seva coordinator for your
          center (if any) will be notified by email.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-semibold text-zinc-800">Organization name *</label>
            <input
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-800">City / Sai center *</label>
            <select
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              <option value="">Select center city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-800">About your organization</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
              placeholder="Mission, activities, or other context for reviewers…"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-800">Contact phone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-800">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
              placeholder="https://…"
            />
          </div>

          {msg && (
            <p
              className={
                msg.kind === "ok" ? "text-sm text-emerald-800" : "text-sm text-red-700"
              }
            >
              {msg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Submitting…" : "Submit for review"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link href="/community-outreach" className="text-blue-700 underline">
            ← Community Outreach steps
          </Link>
        </p>
      </div>
    </div>
  );
}
