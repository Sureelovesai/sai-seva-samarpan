"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

export type PortalEventFormInitial = {
  id: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string; // ISO
  heroImageUrl: string | null;
  flyerUrl: string | null;
  signupsEnabled: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  /** RSVP notification email; empty on create uses server default (your login email). */
  organizerEmail?: string | null;
};

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(local: string): string {
  const d = new Date(local);
  return d.toISOString();
}

export function PortalEventForm({
  mode,
  initial,
  onSaved,
}: {
  mode: "create" | "edit" | "clone";
  initial?: PortalEventFormInitial | null;
  onSaved?: (event: { id: string; title?: string; kind?: "clone" }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [venue, setVenue] = useState(initial?.venue ?? "");
  const [startsLocal, setStartsLocal] = useState(
    initial?.startsAt ? toDatetimeLocalValue(initial.startsAt) : ""
  );
  const [heroImageUrl, setHeroImageUrl] = useState(initial?.heroImageUrl ?? "");
  const [flyerUrl, setFlyerUrl] = useState(initial?.flyerUrl ?? "");
  const [signupsEnabled, setSignupsEnabled] = useState(initial?.signupsEnabled ?? true);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">(
    initial?.status ?? (mode === "create" || mode === "clone" ? "PUBLISHED" : "DRAFT")
  );
  const [organizerEmail, setOrganizerEmail] = useState(initial?.organizerEmail ?? "");

  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const uploadFile = useCallback(async (file: File, kind: "hero" | "flyer") => {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", kind);
    const res = await fetch("/api/admin/upload-event-asset", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.detail || "Upload failed");
    return data.url as string;
  }, []);

  async function onHeroChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    setSaveError(null);
    try {
      const url = await uploadFile(file, "hero");
      setHeroImageUrl(url);
    } catch (err: unknown) {
      setSaveError((err as Error)?.message || "Hero upload failed");
    } finally {
      setUploadingHero(false);
      e.target.value = "";
    }
  }

  async function onFlyerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFlyer(true);
    setSaveError(null);
    try {
      const url = await uploadFile(file, "flyer");
      setFlyerUrl(url);
    } catch (err: unknown) {
      setSaveError((err as Error)?.message || "Flyer upload failed");
    } finally {
      setUploadingFlyer(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (!title.trim() || !description.trim() || !venue.trim() || !startsLocal) {
      setSaveError("Please fill title, description, venue, and date/time.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        startsAt: fromDatetimeLocalValue(startsLocal),
        heroImageUrl: heroImageUrl.trim() || null,
        flyerUrl: flyerUrl.trim() || null,
        signupsEnabled,
        status,
        organizerEmail: organizerEmail.trim() ? organizerEmail.trim().toLowerCase() : null,
      };

      if (mode === "create" || mode === "clone") {
        const res = await fetch("/api/admin/portal-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Save failed");
        onSaved?.({
          id: data.id,
          title: typeof data.title === "string" ? data.title : undefined,
          kind: mode === "clone" ? "clone" : undefined,
        });
        return;
      }

      if (!initial?.id) throw new Error("Missing event id");
      const res = await fetch(`/api/admin/portal-events/${encodeURIComponent(initial.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Update failed");
      onSaved?.({ id: data.id });
    } catch (err: unknown) {
      setSaveError((err as Error)?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const flyerIsPdf = flyerUrl.toLowerCase().includes(".pdf") || flyerUrl.includes("application/pdf");

  const reqMark = (
    <span className="text-red-600" aria-hidden="true">
      {" "}
      *
    </span>
  );

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      {mode === "create" ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold text-red-600">*</span> marks required fields. Swami or event photo, flyer, and
          RSVP notification email are optional.
        </p>
      ) : null}

      <div>
        <label className="block text-sm font-semibold text-zinc-800">
          Event title
          {reqMark}
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          required
          maxLength={300}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-800">
          Description
          {reqMark}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-zinc-800">
            Date & time
            {reqMark}
          </label>
          <input
            type="datetime-local"
            value={startsLocal}
            onChange={(e) => setStartsLocal(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-zinc-800">Visibility</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="PUBLISHED">Published — shows on public Events (/events)</option>
            <option value="DRAFT">Draft — hidden from public Events (admin only)</option>
            <option value="ARCHIVED">Archived — hidden from public Events</option>
          </select>
          <p className="mt-1.5 text-xs text-zinc-600">
            Only <strong>Published</strong> events appear when visitors click <strong>Events</strong> in the menu.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-800">
          Venue
          {reqMark}
        </label>
        <textarea
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Building name, address, or online link"
          required
        />
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        <p className="text-sm font-semibold text-indigo-950">Swami or Event Photo</p>
        <p className="mt-1 text-xs text-indigo-900/80">JPEG, PNG, WebP, or GIF — max 4MB</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">
            {uploadingHero ? "Uploading…" : "Upload image"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onHeroChange} disabled={uploadingHero} />
          </label>
          {heroImageUrl ? (
            <button
              type="button"
              className="text-sm text-red-700 underline"
              onClick={() => setHeroImageUrl("")}
            >
              Remove
            </button>
          ) : null}
        </div>
        {heroImageUrl ? (
          <div className="relative mt-3 h-40 w-full max-w-md overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImageUrl} alt="" className="h-full w-full object-contain" />
          </div>
        ) : null}
        <p className="mt-2 text-xs text-zinc-600">Or paste a URL:</p>
        <input
          value={heroImageUrl}
          onChange={(e) => setHeroImageUrl(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          placeholder="https://…"
        />
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
        <p className="text-sm font-semibold text-amber-950">Event flyer (PDF or image)</p>
        <p className="mt-1 text-xs text-amber-900/80">PDF, JPEG, PNG, WebP, or GIF — max 4MB</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800">
            {uploadingFlyer ? "Uploading…" : "Upload flyer"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={onFlyerChange}
              disabled={uploadingFlyer}
            />
          </label>
          {flyerUrl ? (
            <button type="button" className="text-sm text-red-700 underline" onClick={() => setFlyerUrl("")}>
              Remove
            </button>
          ) : null}
        </div>
        {flyerUrl ? (
          <div className="mt-3">
            {flyerIsPdf ? (
              <a
                href={flyerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-amber-900 underline"
              >
                Open flyer PDF →
              </a>
            ) : (
              <div className="relative h-48 max-w-md overflow-hidden rounded-lg border border-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flyerUrl} alt="" className="h-full w-full object-contain" />
              </div>
            )}
          </div>
        ) : null}
        <p className="mt-2 text-xs text-zinc-600">Or paste a URL:</p>
        <input
          value={flyerUrl}
          onChange={(e) => setFlyerUrl(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          placeholder="https://…"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-800">RSVP notification email</label>
        <input
          type="email"
          value={organizerEmail}
          onChange={(e) => setOrganizerEmail(e.target.value)}
          className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Leave blank to use your login email when saving"
          autoComplete="email"
        />
        <p className="mt-1 text-xs text-zinc-600">
          When someone RSVPs, we email this address with the response and a Google Calendar link. Leave blank on create to
          default to your account email.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Collect sign-ups (Yes / No / Maybe)</p>
          <p className="text-xs text-zinc-600">Guests enter name, email, and number accompanying</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={signupsEnabled}
            onChange={(e) => setSignupsEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-400"
          />
          Enabled
        </label>
      </div>

      {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-sky-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {saving
            ? "Saving…"
            : mode === "create"
              ? "Create event"
              : mode === "clone"
                ? "Submit clone"
                : "Save changes"}
        </button>
        <Link
          href="/admin/manage-events"
          className="rounded-xl border border-zinc-300 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          Manage events
        </Link>
        <Link
          href="/admin/events-dashboard"
          className="rounded-xl border border-zinc-300 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          Dashboard
        </Link>
      </div>
    </form>
  );
}
