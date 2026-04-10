"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CITIES } from "@/lib/cities";
import { SEVA_CATEGORIES } from "@/lib/categories";
import {
  ContributionItemsEditor,
  type ContributionRow,
} from "@/app/_components/ContributionItemsEditor";

function rowsFromApi(items: unknown): ContributionRow[] {
  if (!Array.isArray(items)) return [];
  return items.map((it: Record<string, unknown>) => ({
    id: typeof it.id === "string" ? it.id : undefined,
    name: String(it.name ?? ""),
    category: String(it.category ?? ""),
    neededLabel: String(it.neededLabel ?? ""),
    maxQuantity: Math.max(1, Number(it.maxQuantity) || 1),
  }));
}

export default function EditCommunityActivityPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [bootLoading, setBootLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [profileCity, setProfileCity] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [city, setCity] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");
  const [coordinatorPhone, setCoordinatorPhone] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState<"PUBLISHED" | "ARCHIVED">("PUBLISHED");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [contributionItems, setContributionItems] = useState<ContributionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/community-outreach/me", { credentials: "include" })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok && (data?.errorCode === "DATABASE_ERROR" || r.status >= 500)) {
          setBlocked("server");
          setBootLoading(false);
          return;
        }
        if (!data?.user) {
          setBlocked("signin");
          setBootLoading(false);
          return;
        }
        const p = data.profile;
        const adminUser = data.role === "ADMIN" || (Array.isArray(data.roles) && data.roles.includes("ADMIN"));
        if (adminUser) {
          setIsAdmin(true);
          if (p?.status === "APPROVED") {
            setOrgName(p.organizationName || "");
            setProfileCity(p.city || "");
            setCity(p.city || "");
          }
          setBootLoading(false);
          return;
        }
        if (!p || p.status !== "APPROVED") {
          setBlocked("notapproved");
          setBootLoading(false);
          return;
        }
        setOrgName(p.organizationName || "");
        setProfileCity(p.city || "");
        setCity(p.city || "");
        setBootLoading(false);
      })
      .catch(() => {
        setBlocked("server");
        setBootLoading(false);
      });
  }, []);

  useEffect(() => {
    if (bootLoading || blocked || !id) return;

    let cancelled = false;
    (async () => {
      setActivityLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/community-outreach/activities/${id}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Could not load activity.");
        if (cancelled) return;

        setTitle(String(data.title ?? ""));
        setCategory(String(data.category ?? ""));
        setDescription(String(data.description ?? ""));
        setCapacity(data.capacity != null ? String(data.capacity) : "");
        setStartDate(data.startDate ? new Date(data.startDate).toISOString().slice(0, 10) : "");
        setEndDate(data.endDate ? new Date(data.endDate).toISOString().slice(0, 10) : "");
        setStartTime(String(data.startTime ?? ""));
        setEndTime(String(data.endTime ?? ""));
        if (typeof data.durationHours === "number" && data.durationHours > 0) {
          setDurationHours(data.durationHours);
        }
        setOrgName(String(data.organizationName ?? ""));
        setProfileCity(String(data.city ?? profileCity));
        setCity(String(data.city ?? profileCity));
        setLocationName(String(data.locationName ?? ""));
        setAddress(String(data.address ?? ""));
        setCoordinatorName(String(data.coordinatorName ?? ""));
        setCoordinatorEmail(String(data.coordinatorEmail ?? ""));
        setCoordinatorPhone(String(data.coordinatorPhone ?? ""));
        setImageUrl(String(data.imageUrl ?? ""));
        setActive(data.isActive !== false);
        setStatus(data.status === "ARCHIVED" ? "ARCHIVED" : "PUBLISHED");
        setContributionItems(rowsFromApi(data.contributionItems));
      } catch (e: unknown) {
        if (!cancelled) setLoadError((e as Error)?.message || "Failed to load activity.");
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootLoading, blocked, id, profileCity]);

  const canSave = useMemo(() => {
    const capNum = capacity.trim() ? Number(capacity) : NaN;
    const capacityOk =
      capacity.trim() !== "" &&
      Number.isFinite(capNum) &&
      Number.isInteger(capNum) &&
      capNum >= 1;
    return (
      title.trim() &&
      category.trim() &&
      city.trim() &&
      startDate.trim() &&
      endDate.trim() &&
      startTime.trim() &&
      endTime.trim() &&
      durationHours > 0 &&
      address.trim() &&
      coordinatorName.trim() &&
      coordinatorEmail.trim() &&
      coordinatorPhone.trim() &&
      capacityOk
    );
  }, [
    title,
    category,
    city,
    startDate,
    endDate,
    startTime,
    endTime,
    durationHours,
    address,
    coordinatorName,
    coordinatorEmail,
    coordinatorPhone,
    capacity,
  ]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-activity-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.detail || "Upload failed");
      if (data.url) setImageUrl(data.url);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function save() {
    setMsg(null);
    if (!canSave || !id) {
      setMsg({
        kind: "err",
        text: "Please complete all required fields (including capacity as a whole number ≥ 1).",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        category: category.trim(),
        description: description.trim() || undefined,
        capacity: Number(capacity.trim()),
        startDate: new Date(startDate + "T12:00:00").toISOString(),
        endDate: new Date(endDate + "T12:00:00").toISOString(),
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        durationHours: durationHours > 0 ? durationHours : undefined,
        ...(isAdmin
          ? { city: city.trim(), organizationName: orgName.trim() }
          : {}),
        locationName: locationName.trim() || undefined,
        address: address.trim(),
        coordinatorName: coordinatorName.trim(),
        coordinatorEmail: coordinatorEmail.trim(),
        coordinatorPhone: coordinatorPhone.trim(),
        imageUrl: imageUrl.trim() || undefined,
        isActive: status === "ARCHIVED" ? false : active,
        status,
        contributionItems: contributionItems
          .filter((r) => r.name.trim())
          .map((r) => ({
            id: r.id?.trim() || undefined,
            name: r.name.trim(),
            category: r.category.trim(),
            neededLabel: r.neededLabel.trim(),
            maxQuantity: r.maxQuantity,
          })),
      };
      const res = await fetch(`/api/community-outreach/activities/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.detail || "Save failed");
      setMsg({ kind: "ok", text: `Saved: ${data.title ?? title}.` });
      if (data.status === "ARCHIVED") {
        setStatus("ARCHIVED");
        setActive(false);
      }
    } catch (err: unknown) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  if (bootLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-zinc-50 text-zinc-600">
        Loading…
      </div>
    );
  }

  if (blocked === "signin") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-zinc-800">Sign in to edit activities.</p>
        <Link
          href={`/login?next=${encodeURIComponent(`/community-outreach/manage-activities/${id}`)}`}
          className="mt-4 inline-block rounded-full bg-blue-600 px-6 py-2 font-semibold text-white"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (blocked === "server") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-lg font-semibold text-zinc-900">Could not load your account</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-block rounded-full bg-zinc-800 px-6 py-2 font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (blocked === "notapproved") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-zinc-800">Your organization profile must be approved.</p>
        <Link href="/community-outreach/profile" className="mt-4 inline-block text-blue-700 underline">
          Complete organization profile
        </Link>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-zinc-800">
        <p>Missing activity id.</p>
        <Link href="/community-outreach/manage-activities" className="mt-4 inline-block text-blue-700 underline">
          Manage activities
        </Link>
      </div>
    );
  }

  if (activityLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-zinc-50 text-zinc-600">
        Loading activity…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-red-700">{loadError}</p>
        <Link href="/community-outreach/manage-activities" className="mt-4 inline-block text-blue-700 underline">
          Back to Manage Activity
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_35%_15%,rgba(255,255,255,0.72),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(110,140,230,0.85),rgba(240,220,140,0.75),rgba(160,150,120,0.75))] py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/community-outreach/manage-activities"
            className="text-sm font-semibold text-blue-800 underline"
          >
            ← Manage Activity
          </Link>
          <Link
            href={`/community-outreach/view-signups?activityId=${encodeURIComponent(id)}`}
            className="text-sm font-semibold text-indigo-800 underline"
          >
            View sign-ups for this listing
          </Link>
        </div>

        <div className="mt-4 rounded-xl border border-indigo-200 bg-white/95 p-6 shadow-md">
          <p className="text-sm font-semibold text-indigo-800">Organization</p>
          {isAdmin ? (
            <div className="mt-2 space-y-2">
              <label className="block text-xs font-medium text-zinc-600">Organization name (shown on Find Community Activity)</label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-lg font-semibold text-zinc-900"
              />
              <p className="text-xs text-zinc-500">Site admin: you can edit org name and city for this listing below.</p>
            </div>
          ) : (
            <>
              <p className="mt-1 text-xl font-bold text-zinc-900">{orgName}</p>
              <p className="text-sm text-zinc-600">City: {profileCity}</p>
            </>
          )}
        </div>

        <h1 className="mt-8 text-center text-3xl font-black italic text-indigo-900 md:text-4xl">
          Edit service activity
        </h1>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-semibold">Activity title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
            />
            <label className="block text-sm font-semibold">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
            >
              <option value="">Select</option>
              {SEVA_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="block text-sm font-semibold">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
            />
            <label className="block text-sm font-semibold">Capacity *</label>
            <input
              type="number"
              min={1}
              step={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2"
            />
            <label className="mt-2 block text-sm font-semibold">Activity image</label>
            <label className="inline-flex cursor-pointer items-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploading}
                onChange={handleImageUpload}
              />
              {uploading ? "Uploading…" : "Upload image"}
            </label>
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
            {imageUrl && (
              <p className="truncate text-xs text-zinc-500">
                {imageUrl}{" "}
                <button type="button" className="text-red-600" onClick={() => setImageUrl("")}>
                  Remove
                </button>
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold">Start date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold">Start time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold">End date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold">End time *</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2"
                />
              </div>
            </div>
            <label className="block text-sm font-semibold">Duration (hours) *</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={durationHours}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v) && v > 0) setDurationHours(v);
              }}
              className="w-28 rounded-md border border-zinc-300 px-2 py-2"
            />
            <label className="block text-sm font-semibold">City *</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
            >
              {(isAdmin ? CITIES : CITIES.filter((c) => c === profileCity)).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="block text-sm font-semibold">Venue / location name</label>
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
            />
            <label className="block text-sm font-semibold">Address *</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Event coordinator *</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input
              placeholder="Name"
              value={coordinatorName}
              onChange={(e) => setCoordinatorName(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
            <input
              type="email"
              placeholder="Email"
              value={coordinatorEmail}
              onChange={(e) => setCoordinatorEmail(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={coordinatorPhone}
              onChange={(e) => setCoordinatorPhone(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold">Listing status</label>
              <select
                value={status}
                onChange={(e) => {
                  const v = e.target.value as "PUBLISHED" | "ARCHIVED";
                  setStatus(v);
                  if (v === "ARCHIVED") setActive(false);
                }}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              >
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived (hidden from public listing)</option>
              </select>
            </div>
            <label className="mt-8 flex items-center gap-2 text-sm md:mt-10">
              <input
                type="checkbox"
                checked={active}
                disabled={status === "ARCHIVED"}
                onChange={(e) => setActive(e.target.checked)}
              />
              Listing active
            </label>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Contribution items (optional)</h2>
          <ContributionItemsEditor items={contributionItems} onChange={setContributionItems} />
        </div>

        {msg && (
          <p className={`mt-6 text-center text-sm ${msg.kind === "ok" ? "text-emerald-800" : "text-red-700"}`}>
            {msg.text}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            disabled={saving || !canSave}
            onClick={save}
            className="rounded-full bg-blue-600 px-10 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href="/find-community-activity"
            className="rounded-full border border-zinc-400 px-6 py-3 font-semibold text-zinc-800"
          >
            View Find Community Activity
          </Link>
        </div>
      </div>
    </div>
  );
}
