"use client";

import { useEffect, useMemo, useState } from "react";
import { CITIES } from "@/lib/cities";
import { SEVA_CATEGORIES } from "@/lib/categories";
import {
  ContributionItemsEditor,
  type ContributionRow,
} from "@/app/_components/ContributionItemsEditor";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export default function AddSevaActivityPage() {
  // UI fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState<string>("");

  const [startDate, setStartDate] = useState<string>(""); // yyyy-mm-dd
  const [startTime, setStartTime] = useState<string>(""); // HH:mm
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [durationHours, setDurationHours] = useState<number>(1); // hours (e.g. 1.5 = 1hr 30min)

  const [city, setCity] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");

  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");
  const [coordinatorPhone, setCoordinatorPhone] = useState("");

  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);

  // Activity image: upload only
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [contributionItems, setContributionItems] = useState<ContributionRow[]>([]);

  // UX state
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  // Seva Coordinator: restrict city to registered locations
  const [allowedCities, setAllowedCities] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        const cities = data?.user?.coordinatorCities;
        if (Array.isArray(cities) && cities.length > 0) {
          setAllowedCities(cities);
          setCity((prev) => (prev ? prev : cities[0]));
        } else {
          setAllowedCities([]);
        }
      })
      .catch(() => setAllowedCities([]));
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
    } catch (err: any) {
      setUploadError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function save(status: Status) {
    setMsg(null);

    if (!canSave) {
      setMsg({
        kind: "err",
        text: "Please fill all required fields: Seva Activity, Category, Start Date, End Date, Start Time, End Time, Duration, City, Address, Capacity (whole number ≥ 1), Coordinator Name, Coordinator Email, and Coordinator Phone.",
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

        // keep these simple for now
        startDate: startDate ? new Date(startDate + "T12:00:00").toISOString() : undefined,
        endDate: endDate ? new Date(endDate + "T12:00:00").toISOString() : undefined,
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
        contributionItems: contributionItems
          .filter((r) => r.name.trim())
          .map((r) => ({
            name: r.name.trim(),
            category: r.category.trim(),
            neededLabel: r.neededLabel.trim(),
            maxQuantity: r.maxQuantity,
          })),
      };

      const res = await fetch("/api/admin/seva-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Save failed.");
      }

      setMsg({ kind: "ok", text: `Saved: ${data.title} (${data.status})` });

      // optional: clear form after publish, keep after draft
      if (status === "PUBLISHED") {
        setTitle("");
        setCategory("");
        setDescription("");
        setCapacity("");
        setStartDate("");
        setEndDate("");
        setStartTime("");
        setEndTime("");
        setDurationHours(1);
        setCity("");
        setLocationName("");
        setAddress("");
        setCoordinatorName("");
        setCoordinatorEmail("");
        setCoordinatorPhone("");
        setImageUrl("");
        setActive(true);
        setFeatured(false);
        setContributionItems([]);
      }
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Internal error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_35%_15%,rgba(255,255,255,0.72),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(110,140,230,0.85),rgba(240,220,140,0.75),rgba(160,150,120,0.75))]">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12">
        {/* top divider line below header (like screenshots) */}
        <div className="h-[2px] w-full bg-black/10 shadow-sm" />

        {/* TITLE ROW */}
        <div className="mt-6 text-center">
          <div className="text-5xl font-black italic tracking-wide text-indigo-900 drop-shadow-[0_2px_0_rgba(255,255,255,0.8)] md:text-6xl" style={{ textShadow: "0 2px 0 rgba(255,255,255,0.9), 0 3px 6px rgba(0,0,0,0.25)" }}>
            CREATE SEVA ACTIVITY
          </div>
        </div>

        {/* TOP IMAGE ROW */}
        <section className="mt-6 grid gap-8 md:grid-cols-2 md:items-start">
          {/* Left: Create Seva image */}
          <div className="mx-auto w-full max-w-[520px]">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-none bg-white shadow-[0_12px_26px_rgba(0,0,0,0.28)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/create-seva-graphic.jpg"
                alt="Create Seva Graphic"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* Right: Swami image */}
          <div className="mx-auto w-full max-w-[520px]">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-none bg-white shadow-[0_12px_26px_rgba(0,0,0,0.28)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/swami-create-seva.jpg"
                alt="Swami"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* FORM AREA (two big cards) */}
        <section className="mt-10 grid gap-8 md:grid-cols-2">
          {/* LEFT CARD */}
          <div className="overflow-hidden rounded-none bg-white shadow-[0_14px_30px_rgba(0,0,0,0.30)]">
            {/* yellow header strip for first field */}
            <div className="bg-yellow-200/90 px-5 py-4">
              <label className="block text-sm font-semibold text-zinc-800">
                Seva Activity <span className="text-red-600">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="px-5 py-5">
              <label className="block text-sm font-semibold text-zinc-800">
                Find Seva (Service Category) <span className="text-red-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-none border border-zinc-700 bg-white px-4 py-3 text-zinc-900 outline-none"
              >
                <option value="">Select</option>
                {SEVA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Description block in yellow strip like screenshot */}
            <div className="bg-yellow-200/90 px-5 py-5">
              <label className="block text-sm font-semibold text-zinc-800">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="mt-2 w-full resize-none rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="px-5 py-6">
              <label className="block text-sm font-semibold text-zinc-800">
                Capacity <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="# Volunteers Required"
                className="mt-2 w-full max-w-[360px] rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Upload Activity Image */}
            <div className="bg-yellow-200/90 px-5 py-5">
              <label className="inline-flex w-full max-w-[420px] cursor-pointer items-center justify-center gap-3 rounded-lg bg-emerald-800 px-6 py-4 text-base font-semibold text-white shadow hover:bg-emerald-900 disabled:opacity-60">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleImageUpload}
                />
                <span className="text-2xl leading-none">＋</span>
                {uploading ? "Uploading…" : "Upload Activity Image"}
              </label>
              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}
              {imageUrl && (
                <div className="mt-4 flex items-start gap-3">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded border border-zinc-300 bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Activity"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-700">Uploaded image</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">{imageUrl}</p>
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="mt-2 text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT CARD */}
          <div className="overflow-hidden rounded-none bg-white shadow-[0_14px_30px_rgba(0,0,0,0.30)]">
            <div className="bg-yellow-200/90 px-5 py-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-zinc-800">
                    Start Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="mt-2 w-full rounded-none border-b-2 border-b-indigo-600 border-transparent bg-white px-4 py-3 text-zinc-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-800">
                    Start Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="mt-2 w-full rounded-none border border-zinc-700 bg-white px-4 py-3 text-zinc-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-800">
                    End Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="mt-2 w-full rounded-none border-b-2 border-b-indigo-600 border-transparent bg-white px-4 py-3 text-zinc-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-800">
                    End Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="mt-2 w-full rounded-none border border-zinc-700 bg-white px-4 py-3 text-zinc-900 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-zinc-800">
                    Duration (hours) <span className="text-red-600">*</span>
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Decrease duration"
                      onClick={() => setDurationHours((h) => Math.max(0, h - 0.5))}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none border border-zinc-700 bg-white text-xl font-bold text-zinc-700 shadow hover:bg-zinc-50"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={durationHours}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!Number.isNaN(v) && v >= 0) setDurationHours(v);
                      }}
                      className="w-24 rounded-none border border-zinc-700 bg-white px-4 py-3 text-center text-zinc-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      aria-label="Increase duration"
                      onClick={() => setDurationHours((h) => h + 0.5)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none border border-zinc-700 bg-white text-xl font-bold text-zinc-700 shadow hover:bg-zinc-50"
                    >
                      +
                    </button>
                    <span className="text-sm font-medium text-zinc-600">hrs</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-6">
              <label className="block text-sm font-semibold text-zinc-800">
                City <span className="text-red-600">*</span>
              </label>
              {allowedCities !== null && allowedCities.length > 0 ? (
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select location</option>
                  {allowedCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select city</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              <label className="mt-5 block text-sm font-semibold text-zinc-800">
                Location Name
              </label>
              <input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <label className="mt-5 block text-sm font-semibold text-zinc-800">
                Address <span className="text-red-600">*</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={6}
                required
                className="mt-2 w-full resize-none rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </section>

        {/* COORDINATOR + ACTIONS (bottom wide card) */}
        <section className="mt-10">
          <div className="overflow-hidden rounded-none bg-white shadow-[0_14px_30px_rgba(0,0,0,0.30)]">
            <div className="px-6 py-8">
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-indigo-600">
                    Coordinator Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={coordinatorName}
                    onChange={(e) => setCoordinatorName(e.target.value)}
                    required
                    className="mt-2 w-full border-b-2 border-indigo-500 bg-indigo-50/40 px-3 py-2 text-zinc-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-indigo-600">
                    Coordinator Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={coordinatorEmail}
                    onChange={(e) => setCoordinatorEmail(e.target.value)}
                    placeholder="example@domain.com"
                    required
                    className="mt-2 w-full rounded-none border border-indigo-500 bg-white px-4 py-3 text-zinc-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-indigo-600">
                    Coordinator Phone number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={coordinatorPhone}
                    onChange={(e) => setCoordinatorPhone(e.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-indigo-500 bg-white px-4 py-3 text-zinc-900 outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-10">
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-6 w-6 accent-indigo-600"
                  />
                  <span className="text-lg font-semibold text-indigo-950">
                    Active
                  </span>
                </label>

                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="h-6 w-6 accent-indigo-600"
                  />
                  <span className="text-lg font-semibold text-indigo-950">
                    Featured
                  </span>
                </label>
              </div>

              {/* messages */}
              {msg && (
                <div
                  className={[
                    "mt-6 rounded-none px-4 py-3 text-sm font-semibold",
                    msg.kind === "ok"
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-red-100 text-red-900",
                  ].join(" ")}
                >
                  {msg.text}
                </div>
              )}

              <div className="mt-8 grid gap-6 md:grid-cols-2 md:items-center">
                {/* Save & Publish */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save("PUBLISHED")}
                  className={[
                    "mx-auto inline-flex w-full max-w-[420px] items-center justify-center gap-4 rounded-full px-10 py-5 text-xl font-semibold tracking-[0.35em] text-white shadow",
                    saving ? "bg-zinc-400" : "bg-emerald-800 hover:bg-emerald-900",
                  ].join(" ")}
                >
                  <span>{saving ? "Saving..." : "Save & Publish"}</span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white">
                    ✓
                  </span>
                </button>

                {/* Save & Draft */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save("DRAFT")}
                  className={[
                    "mx-auto inline-flex w-full max-w-[420px] items-center justify-center gap-4 rounded-full bg-gradient-to-r from-blue-300 via-yellow-200 to-blue-200 px-10 py-5 text-xl font-semibold tracking-[0.35em] text-red-500 shadow hover:brightness-95",
                    saving ? "opacity-70" : "",
                  ].join(" ")}
                >
                  <span>Save &amp; Draft</span>
                  <span className="text-2xl leading-none">💾</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Item contributions (optional) */}
        <section className="mt-10 overflow-hidden rounded-none bg-white p-6 shadow-[0_14px_30px_rgba(0,0,0,0.22)] md:p-8">
          <ContributionItemsEditor
            items={contributionItems}
            onChange={setContributionItems}
            disabled={saving}
          />
        </section>

        {/* bottom spacer so footer never feels stuck */}
        <div className="mt-10 h-6" />
      </div>
    </div>
  );
}