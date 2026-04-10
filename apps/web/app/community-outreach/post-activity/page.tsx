"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CITIES } from "@/lib/cities";
import { SEVA_CATEGORIES } from "@/lib/categories";
import {
  ContributionItemsEditor,
  type ContributionRow,
} from "@/app/_components/ContributionItemsEditor";

export default function CommunityOutreachPostActivityPage() {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
          setLoading(false);
          return;
        }
        if (!data?.user) {
          setBlocked("signin");
          setLoading(false);
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
          } else {
            setCity(CITIES[0] ?? "");
          }
          setLoading(false);
          return;
        }
        if (!p || p.status !== "APPROVED") {
          setBlocked("notapproved");
          setLoading(false);
          return;
        }
        setOrgName(p.organizationName || "");
        setProfileCity(p.city || "");
        setCity(p.city || "");
        setLoading(false);
      })
      .catch(() => {
        setBlocked("server");
        setLoading(false);
      });
  }, []);

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
      (!isAdmin || orgName.trim()) &&
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
    isAdmin,
    orgName,
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
    if (!canSave) {
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
        ...(isAdmin ? { organizationName: orgName.trim() } : {}),
        description: description.trim() || undefined,
        capacity: Number(capacity.trim()),
        startDate: new Date(startDate + "T12:00:00").toISOString(),
        endDate: new Date(endDate + "T12:00:00").toISOString(),
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        durationHours: durationHours > 0 ? durationHours : undefined,
        city: city.trim(),
        locationName: locationName.trim() || undefined,
        address: address.trim(),
        coordinatorName: coordinatorName.trim(),
        coordinatorEmail: coordinatorEmail.trim(),
        coordinatorPhone: coordinatorPhone.trim(),
        imageUrl: imageUrl.trim() || undefined,
        isActive: active,
        contributionItems: contributionItems
          .filter((r) => r.name.trim())
          .map((r) => ({
            name: r.name.trim(),
            category: r.category.trim(),
            neededLabel: r.neededLabel.trim(),
            maxQuantity: r.maxQuantity,
          })),
      };
      const res = await fetch("/api/community-outreach/activity", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.detail || "Save failed");
      setMsg({
        kind: "ok",
        text: `Published: ${data.title}. It will appear on Find Community Activity with your organization name.`,
      });
      setTitle("");
      setCategory("");
      setDescription("");
      setCapacity("");
      setStartDate("");
      setEndDate("");
      setStartTime("");
      setEndTime("");
      setDurationHours(1);
      setLocationName("");
      setAddress("");
      setCoordinatorName("");
      setCoordinatorEmail("");
      setCoordinatorPhone("");
      setImageUrl("");
      setContributionItems([]);
      setCity(profileCity);
    } catch (err: unknown) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-zinc-50 text-zinc-600">
        Loading…
      </div>
    );
  }

  if (blocked === "signin") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-zinc-800">Sign in to post a service activity.</p>
        <Link
          href={`/login?next=${encodeURIComponent("/community-outreach/post-activity")}`}
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
        <p className="mt-2 text-sm text-zinc-600">
          The server had trouble talking to the database. Confirm DATABASE_URL, run migrations, and try again.
        </p>
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
        <p className="text-zinc-800">
          Your organization profile must be approved before you can post activities.
        </p>
        <Link href="/community-outreach/profile" className="mt-4 inline-block text-blue-700 underline">
          Complete organization profile
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_35%_15%,rgba(255,255,255,0.72),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(110,140,230,0.85),rgba(240,220,140,0.75),rgba(160,150,120,0.75))] py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-xl border border-indigo-200 bg-white/95 p-6 shadow-md">
          <p className="text-sm font-semibold text-indigo-800">Organization (shown on Find Community Activity)</p>
          {isAdmin && !profileCity ? (
            <div className="mt-2 space-y-2">
              <label className="block text-xs font-medium text-zinc-600">Organization name *</label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-lg font-semibold text-zinc-900"
                placeholder="Partner organization name"
              />
              <p className="text-xs text-zinc-500">
                As a site administrator you can post without your own approved profile; choose city in the form below.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-1 text-xl font-bold text-zinc-900">{orgName}</p>
              <p className="text-sm text-zinc-600">Activities must be listed for: {profileCity}</p>
            </>
          )}
        </div>

        <h1 className="mt-8 text-center text-3xl font-black italic text-indigo-900 md:text-4xl">
          Post a service activity
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-700">
          Same information as the admin “Add Seva Activity” flow. Your listing appears on{" "}
          <strong>Find Community Activity</strong>, not on Find Seva.
        </p>

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
              {(isAdmin && !profileCity ? CITIES : CITIES.filter((c) => c === profileCity)).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {!isAdmin && city !== profileCity && (
              <p className="text-xs text-amber-800">City is fixed to your approved center.</p>
            )}
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
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Listing active
          </label>
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
            {saving ? "Publishing…" : "Publish listing"}
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
