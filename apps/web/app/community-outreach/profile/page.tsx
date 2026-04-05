"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CITIES } from "@/lib/cities";

function OrganizationLogoPreview({
  logoUrl,
  organizationName,
}: {
  logoUrl: string;
  organizationName: string;
}) {
  const src = logoUrl.trim();
  return (
    <div className="flex h-full min-h-[140px] w-full shrink-0 items-center justify-center overflow-hidden bg-zinc-200 md:w-[180px]">
      <div className="relative aspect-[9/8] w-full max-w-[180px] overflow-hidden">
        {src ? (
          (() => {
            const isRelativeOrBlob =
              src.startsWith("/") || src.includes("blob.vercel-storage.com");
            if (isRelativeOrBlob) {
              return (
                <Image
                  src={src}
                  alt={organizationName || "Organization logo"}
                  fill
                  className="object-contain object-center"
                  sizes="180px"
                />
              );
            }
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={organizationName || "Organization logo"}
                className="absolute inset-0 h-full w-full object-contain object-center"
              />
            );
          })()
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-200 px-3 text-center">
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              Company image
            </span>
            <span className="text-[11px] leading-snug text-zinc-400">
              Optional — upload or paste URL. Shown like Find Seva, on the right when listed.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommunityOutreachProfilePage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
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
          setLogoUrl(typeof p.logoUrl === "string" ? p.logoUrl : "");
        } else if (p) {
          setOrganizationName(p.organizationName || "");
          setCity(p.city || "");
          setDescription(p.description || "");
          setContactPhone(p.contactPhone || "");
          setWebsite(p.website || "");
          setLogoUrl(typeof p.logoUrl === "string" ? p.logoUrl : "");
          setProfileStatus(p.status);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoadError("Could not reach the server. Check your connection and try again.");
        setLoading(false);
      });
  }, []);

  async function handleLogoFile(file: File | null) {
    if (!file) return;
    setMsg(null);
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/community-outreach/upload-logo", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? `${data.error || "Upload failed"}: ${data.detail}`
            : data.error || "Upload failed"
        );
      }
      if (typeof data.url === "string") setLogoUrl(data.url);
    } catch (err: unknown) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setLogoUploading(false);
    }
  }

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
          logoUrl: logoUrl.trim() || undefined,
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
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-2xl font-bold text-zinc-900">Organization profile</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Our review team will review your submission. Admins and the seva coordinator for your
          center (if any) will be notified by email.
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] md:items-stretch">
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
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

              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-4">
                <label className="block text-sm font-semibold text-zinc-800">
                  Company / organization image (optional)
                </label>
                <p className="mt-1 text-xs text-zinc-500">
                  Appears on Partner Organizations to the right of your details (same balance as images on Find Seva).
                </p>
                <input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  placeholder="https://… or leave blank and upload below"
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-400 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={logoUploading || saving}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void handleLogoFile(f);
                      }}
                    />
                    {logoUploading ? "Uploading…" : "Upload image"}
                  </label>
                  {logoUrl.trim() ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-red-700 underline"
                      onClick={() => setLogoUrl("")}
                    >
                      Clear image
                    </button>
                  ) : null}
                </div>
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
                disabled={saving || logoUploading}
                className="w-full rounded-full bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Submitting…" : "Submit for review"}
              </button>
            </form>

            <div className="border-t border-zinc-200 md:border-l md:border-t-0">
              <OrganizationLogoPreview logoUrl={logoUrl} organizationName={organizationName} />
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/community-outreach" className="text-blue-700 underline">
            ← Community Outreach steps
          </Link>
        </p>
      </div>
    </div>
  );
}
