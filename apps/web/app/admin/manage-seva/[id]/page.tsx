"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CITIES } from "@/lib/cities";
import { SEVA_CATEGORIES } from "@/lib/categories";

type ActivityData = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  city: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationHours: number | null;
  locationName: string | null;
  address: string | null;
  capacity: number | null;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  coordinatorPhone: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  status: string;
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toTimeInputValue(iso: string | null, timeStr: string | null): string {
  if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) return timeStr.slice(0, 5);
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function EditSevaActivityPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationHours, setDurationHours] = useState<number>(1);

  const [city, setCity] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");

  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");
  const [coordinatorPhone, setCoordinatorPhone] = useState("");

  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("PUBLISHED");

  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const canSave = useMemo(() => title.trim() && category.trim() && city.trim(), [title, category, city]);

  const loadActivity = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/seva-activities/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load activity");
      const a = (await res.json()) as ActivityData;
      setTitle(a.title ?? "");
      setCategory(a.category ?? "");
      setDescription(a.description ?? "");
      setCapacity(a.capacity != null ? String(a.capacity) : "");

      setStartDate(toDateInputValue(a.startDate));
      setEndDate(toDateInputValue(a.endDate));
      setStartTime(toTimeInputValue(a.startDate, a.startTime));
      setEndTime(toTimeInputValue(a.endDate, a.endTime));
      setDurationHours(a.durationHours != null && a.durationHours >= 0 ? a.durationHours : 1);

      setCity(a.city ?? "");
      setLocationName(a.locationName ?? "");
      setAddress(a.address ?? "");

      setCoordinatorName(a.coordinatorName ?? "");
      setCoordinatorEmail(a.coordinatorEmail ?? "");
      setCoordinatorPhone(a.coordinatorPhone ?? "");

      setImageUrl(a.imageUrl ?? "");
      setActive(a.isActive ?? true);
      setFeatured(a.isFeatured ?? false);
      setStatus((a.status as "DRAFT" | "PUBLISHED" | "ARCHIVED") || "PUBLISHED");
    } catch (e: unknown) {
      setLoadError((e as Error)?.message ?? "Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-activity-image", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.detail || "Upload failed");
      if (data.url) setImageUrl(data.url);
    } catch (err: unknown) {
      setUploadError((err as Error)?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function saveChanges() {
    setMsg(null);
    if (!canSave) {
      setMsg({ kind: "err", text: "Please fill required fields: Seva Activity, Category, and City." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        category: category.trim(),
        description: description.trim() || undefined,
        capacity: capacity.trim() ? Number(capacity) : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        durationHours: durationHours > 0 ? durationHours : undefined,
        city: city.trim(),
        locationName: locationName.trim() || undefined,
        address: address.trim() || undefined,
        coordinatorName: coordinatorName.trim() || undefined,
        coordinatorEmail: coordinatorEmail.trim() || undefined,
        coordinatorPhone: coordinatorPhone.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        isActive: active,
        isFeatured: featured,
        status,
      };
      const res = await fetch(`/api/admin/seva-activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || "Save failed.");
      setMsg({ kind: "ok", text: `Saved: ${data.title}` });
    } catch (e: unknown) {
      setMsg({ kind: "err", text: (e as Error)?.message || "Internal error." });
    } finally {
      setSaving(false);
    }
  }

  if (!id) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-red-700">Missing activity ID.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-zinc-600">Loading activity…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-center text-red-700">{loadError}</p>
        <div className="mt-6 flex justify-center">
          <Link href="/admin/manage-seva" className="text-indigo-600 underline hover:no-underline">
            ← Back to Manage Seva
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_35%_15%,rgba(255,255,255,0.72),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(110,140,230,0.85),rgba(240,220,140,0.75),rgba(160,150,120,0.75))]">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12">
        <div className="h-[2px] w-full bg-black/10 shadow-sm" />

        <div className="mt-6 flex items-center justify-between">
          <Link href="/admin/manage-seva" className="text-indigo-800 underline hover:no-underline">
            ← Back to Manage Seva
          </Link>
          <h1 className="text-3xl font-extrabold italic tracking-wide text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.30)]">
            EDIT SEVA ACTIVITY
          </h1>
          <span />
        </div>

        <section className="mt-10 grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-none bg-white shadow-[0_14px_30px_rgba(0,0,0,0.30)]">
            <div className="bg-yellow-200/90 px-5 py-4">
              <label className="block text-sm font-semibold text-zinc-800">Seva Activity <span className="text-red-600">*</span></label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="px-5 py-5">
              <label className="block text-sm font-semibold text-zinc-800">Find Seva (Service Category) <span className="text-red-600">*</span></label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-none border border-zinc-700 bg-white px-4 py-3 text-zinc-900 outline-none">
                <option value="">Select</option>
                {SEVA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="bg-yellow-200/90 px-5 py-5">
              <label className="block text-sm font-semibold text-zinc-800">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="mt-2 w-full resize-none rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="px-5 py-6">
              <label className="block text-sm font-semibold text-zinc-800">Capacity</label>
              <input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="# Volunteers Required" className="mt-2 w-full max-w-[360px] rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="bg-yellow-200/90 px-5 py-5">
              <label className="inline-flex w-full max-w-[420px] cursor-pointer items-center justify-center gap-3 rounded-lg bg-emerald-800 px-6 py-4 text-base font-semibold text-white shadow hover:bg-emerald-900 disabled:opacity-60">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploading} onChange={handleImageUpload} />
                <span className="text-2xl leading-none">＋</span>
                {uploading ? "Uploading…" : "Upload Activity Image (Optional)"}
              </label>
              {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
              {imageUrl && (
                <div className="mt-4 flex items-start gap-3">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded border border-zinc-300 bg-zinc-100">
                    <Image src={imageUrl} alt="Activity" fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-700">Uploaded image</p>
                    <button type="button" onClick={() => setImageUrl("")} className="mt-2 text-xs font-medium text-red-600 hover:underline">Remove</button>
                  </div>
                </div>
              )}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-zinc-700">Or paste Image URL</label>
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/uploads/... or https://..." className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-none bg-white shadow-[0_14px_30px_rgba(0,0,0,0.30)]">
            <div className="bg-yellow-200/90 px-5 py-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-zinc-800">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-2 w-full rounded-none border-b-2 border-b-indigo-600 border-transparent bg-white px-4 py-3 text-zinc-900 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-800">Start Time</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-2 w-full rounded-none border border-zinc-700 bg-white px-4 py-3 text-zinc-900 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-800">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-2 w-full rounded-none border-b-2 border-b-indigo-600 border-transparent bg-white px-4 py-3 text-zinc-900 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-800">End Time</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-2 w-full rounded-none border border-zinc-700 bg-white px-4 py-3 text-zinc-900 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-zinc-800">Duration (hours)</label>
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" aria-label="Decrease duration" onClick={() => setDurationHours((h) => Math.max(0, h - 0.5))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none border border-zinc-700 bg-white text-xl font-bold text-zinc-700 shadow hover:bg-zinc-50">−</button>
                    <input type="number" min={0} step={0.5} value={durationHours} onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v) && v >= 0) setDurationHours(v); }} className="w-24 rounded-none border border-zinc-700 bg-white px-4 py-3 text-center text-zinc-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <button type="button" aria-label="Increase duration" onClick={() => setDurationHours((h) => h + 0.5)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none border border-zinc-700 bg-white text-xl font-bold text-zinc-700 shadow hover:bg-zinc-50">+</button>
                    <span className="text-sm font-medium text-zinc-600">hrs</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-6">
              <label className="block text-sm font-semibold text-zinc-800">City <span className="text-red-600">*</span></label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select city</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <label className="mt-5 block text-sm font-semibold text-zinc-800">Location Name</label>
              <input value={locationName} onChange={(e) => setLocationName(e.target.value)} className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500" />
              <label className="mt-5 block text-sm font-semibold text-zinc-800">Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={6} className="mt-2 w-full resize-none rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="overflow-hidden rounded-none bg-white shadow-[0_14px_30px_rgba(0,0,0,0.30)]">
            <div className="px-6 py-8">
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-indigo-600">Coordinator Name</label>
                  <input value={coordinatorName} onChange={(e) => setCoordinatorName(e.target.value)} className="mt-2 w-full border-b-2 border-indigo-500 bg-indigo-50/40 px-3 py-2 text-zinc-900 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-indigo-600">Coordinator Email</label>
                  <input value={coordinatorEmail} onChange={(e) => setCoordinatorEmail(e.target.value)} placeholder="example@domain.com" className="mt-2 w-full rounded-none border border-indigo-500 bg-white px-4 py-3 text-zinc-900 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-indigo-600">Coordinator Phone</label>
                  <input value={coordinatorPhone} onChange={(e) => setCoordinatorPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-indigo-500 bg-white px-4 py-3 text-zinc-900 outline-none" />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-10">
                <label className="inline-flex items-center gap-3">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-6 w-6 accent-indigo-600" />
                  <span className="text-lg font-semibold text-indigo-950">Active</span>
                </label>
                <label className="inline-flex items-center gap-3">
                  <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-6 w-6 accent-indigo-600" />
                  <span className="text-lg font-semibold text-indigo-950">Featured</span>
                </label>
                <div>
                  <label className="block text-sm font-semibold text-zinc-800">Status</label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const v = e.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED";
                      setStatus(v);
                      if (v === "ARCHIVED") setActive(false); // so Active activities count updates when event is cancelled
                    }}
                    className="mt-2 rounded border border-zinc-600 bg-white px-3 py-2 text-zinc-900"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>
              {msg && (
                <div className={["mt-6 rounded-none px-4 py-3 text-sm font-semibold", msg.kind === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"].join(" ")}>
                  {msg.text}
                </div>
              )}
              <div className="mt-8 flex flex-wrap gap-6">
                <button type="button" disabled={saving} onClick={saveChanges} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-800 px-10 py-5 text-xl font-semibold tracking-wide text-white shadow hover:bg-emerald-900 disabled:opacity-70">
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <Link href="/admin/manage-seva" className="inline-flex items-center rounded-full border-2 border-zinc-600 bg-white px-10 py-5 text-xl font-semibold text-zinc-800 hover:bg-zinc-50">
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 h-6" />
      </div>
    </div>
  );
}
