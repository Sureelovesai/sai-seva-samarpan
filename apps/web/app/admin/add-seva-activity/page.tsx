"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CITIES } from "@/lib/cities";
import { SEVA_CATEGORIES } from "@/lib/categories";
import { USA_REGION_LABELS } from "@/lib/usaRegions";
import {
  ContributionItemsEditor,
  type ContributionRow,
} from "@/app/_components/ContributionItemsEditor";

const SS_BULK_ID = "sevaBulkActivityId";
const SS_BULK_TITLE = "sevaBulkActivityTitle";
const SS_BULK_PUBLISHED = "sevaBulkImportAllowed";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type ActivityScopeUi = "CENTER" | "REGIONAL" | "NATIONAL";

const LEVEL_LABELS: Record<ActivityScopeUi, string> = {
  CENTER: "Center level",
  REGIONAL: "Regional level",
  NATIONAL: "National level",
};

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
  const [allowKids, setAllowKids] = useState(true);

  // Activity image: upload only
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [contributionItems, setContributionItems] = useState<ContributionRow[]>([]);

  /** Optional program / festival grouping (SevaActivityGroup) */
  const [programGroups, setProgramGroups] = useState<{ id: string; title: string }[]>([]);
  const [groupChoice, setGroupChoice] = useState<string>("");
  const [newGroupTitle, setNewGroupTitle] = useState("");

  /** After a successful save, bulk Excel import uses this activity (template + upload APIs). */
  const [bulkActivityId, setBulkActivityId] = useState<string | null>(null);
  const [bulkActivityTitle, setBulkActivityTitle] = useState<string | null>(null);
  const [bulkImportAllowed, setBulkImportAllowed] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<{ row: number; column: string; message: string }[] | null>(null);
  const [bulkOk, setBulkOk] = useState<string | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  // UX state
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  // Seva Coordinator: restrict city to registered locations
  const [allowedCities, setAllowedCities] = useState<string[] | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [coordinatorRegions, setCoordinatorRegions] = useState<string[] | null>(null);
  const [activityScope, setActivityScope] = useState<ActivityScopeUi>("CENTER");
  const [sevaUsaRegion, setSevaUsaRegion] = useState("");

  const scopeOptions = useMemo((): ActivityScopeUi[] => {
    const r = userRoles;
    if (!r.length) return ["CENTER"];
    const admin = r.includes("ADMIN") || r.includes("BLOG_ADMIN");
    const next: ActivityScopeUi[] = [];
    if (admin || r.includes("SEVA_COORDINATOR")) next.push("CENTER");
    if (admin || (r.includes("REGIONAL_SEVA_COORDINATOR") && coordinatorRegions && coordinatorRegions.length > 0)) {
      next.push("REGIONAL");
    }
    if (admin || r.includes("NATIONAL_SEVA_COORDINATOR")) next.push("NATIONAL");
    if (next.length === 0) {
      if (r.includes("REGIONAL_SEVA_COORDINATOR")) next.push("REGIONAL");
      else if (r.includes("NATIONAL_SEVA_COORDINATOR")) next.push("NATIONAL");
      else next.push("CENTER");
    }
    return next;
  }, [userRoles, coordinatorRegions]);

  const regionalRegionChoices = useMemo(() => {
    if (!coordinatorRegions?.length) return [...USA_REGION_LABELS];
    const set = new Set(coordinatorRegions);
    return USA_REGION_LABELS.filter((x) => set.has(x));
  }, [coordinatorRegions]);

  useEffect(() => {
    try {
      const sid = sessionStorage.getItem(SS_BULK_ID);
      if (!sid) return;
      setBulkActivityId(sid);
      const t = sessionStorage.getItem(SS_BULK_TITLE);
      if (t) setBulkActivityTitle(t);
      setBulkImportAllowed(sessionStorage.getItem(SS_BULK_PUBLISHED) === "1");

      fetch(`/api/admin/seva-activities/${sid}`, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((a: { status?: string; title?: string } | null) => {
          if (!a) return;
          if (a.title) setBulkActivityTitle(a.title);
          if (a.status === "PUBLISHED") {
            setBulkImportAllowed(true);
            try {
              sessionStorage.setItem(SS_BULK_PUBLISHED, "1");
            } catch {
              /* ignore */
            }
          }
        })
        .catch(() => {});
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        const cities = data?.user?.coordinatorCities;
        const roles: string[] = Array.isArray(data?.user?.roles) ? data.user.roles : [];
        setUserRoles(roles);
        const regs = data?.user?.coordinatorRegions;
        setCoordinatorRegions(Array.isArray(regs) && regs.length > 0 ? regs : null);
        if (Array.isArray(cities) && cities.length > 0) {
          setAllowedCities(cities);
          setCity((prev) => (prev ? prev : cities[0]));
        } else {
          setAllowedCities([]);
        }
      })
      .catch(() => {
        setAllowedCities([]);
        setUserRoles([]);
        setCoordinatorRegions(null);
      });
  }, []);

  useEffect(() => {
    if (!scopeOptions.length) return;
    if (scopeOptions.length === 1) {
      setActivityScope(scopeOptions[0]!);
    } else if (!scopeOptions.includes(activityScope)) {
      setActivityScope(scopeOptions[0]!);
    }
  }, [scopeOptions, activityScope]);

  useEffect(() => {
    if (activityScope === "NATIONAL" && !city.trim()) {
      setCity("National");
    }
  }, [activityScope]);

  useEffect(() => {
    const c =
      activityScope === "NATIONAL" ? (city.trim() || "National") : city.trim();
    // REGIONAL: list programs by USA region only (location line differs per activity, so do not filter by city).
    if (activityScope === "REGIONAL") {
      if (!sevaUsaRegion.trim()) {
        setProgramGroups([]);
        return;
      }
    } else if (!c) {
      setProgramGroups([]);
      return;
    }
    const params = new URLSearchParams();
    params.set("scope", activityScope);
    if (activityScope === "REGIONAL") {
      params.set("sevaUsaRegion", sevaUsaRegion.trim());
    } else {
      params.set("city", c);
    }
    let cancelled = false;
    fetch(`/api/admin/seva-activity-groups?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(rows)
          ? rows.map((x: { id?: string; title?: string }) => ({
              id: String(x.id ?? ""),
              title: String(x.title ?? ""),
            })).filter((x) => x.id && x.title)
          : [];
        setProgramGroups(list);
      })
      .catch(() => {
        if (!cancelled) setProgramGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activityScope, city, sevaUsaRegion]);

  const canSave = useMemo(() => {
    const capNum = capacity.trim() ? Number(capacity) : NaN;
    const capacityOk =
      capacity.trim() !== "" &&
      Number.isFinite(capNum) &&
      Number.isInteger(capNum) &&
      capNum >= 1;
    const scopeOk =
      activityScope !== "REGIONAL" || (sevaUsaRegion.trim() !== "" && city.trim() !== "");
    return (
      title.trim() &&
      category.trim() &&
      city.trim() &&
      scopeOk &&
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
    activityScope,
    sevaUsaRegion,
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

  async function downloadBulkTemplate() {
    if (saving) return;
    setBulkErrors(null);
    setBulkOk(null);
    const urlPath = bulkActivityId
      ? `/api/admin/seva-activities/${bulkActivityId}/bulk-signups/template`
      : "/api/admin/seva-activities/excel-template";
    const fallbackName = bulkActivityId
      ? `seva-activity-workbook-${bulkActivityId.slice(0, 8)}.xlsx`
      : "seva-activity-template-blank.xlsx";
    try {
      const r = await fetch(urlPath, {
        credentials: "include",
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setBulkErrors([
          {
            row: 1,
            column: "—",
            message: typeof d?.error === "string" ? d.error : "Could not download template.",
          },
        ]);
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fallbackName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setBulkErrors([{ row: 1, column: "—", message: (e as Error)?.message ?? "Download failed." }]);
    }
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;

    setBulkErrors(null);
    setBulkOk(null);

    const importIntoSavedPublished =
      Boolean(bulkActivityId) && bulkImportAllowed;
    if (bulkActivityId && !bulkImportAllowed) {
      setBulkErrors([
        {
          row: 1,
          column: "—",
          message:
            "This browser has a **draft** activity saved from this page. Use **Save & Publish** to upload into that activity, or open Add Seva in another window without saving a draft if you only want to create from Excel.",
        },
      ]);
      return;
    }

    setBulkUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const url = importIntoSavedPublished
        ? `/api/admin/seva-activities/${bulkActivityId}/bulk-signups/import`
        : "/api/admin/seva-activities/bulk-workbook-import";
      const r = await fetch(url, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (Array.isArray(d.errors)) {
          const grid = d.errors as { row: number; column: string; message: string }[];
          if (d.partial && typeof d.detail === "string") {
            setBulkErrors([{ row: 1, column: "—", message: d.detail }, ...grid]);
          } else {
            setBulkErrors(grid);
          }
        } else {
          setBulkErrors([
            {
              row: 1,
              column: "—",
              message:
                typeof d?.error === "string"
                  ? d.error
                  : typeof d?.detail === "string"
                    ? d.detail
                    : "Import failed.",
            },
          ]);
        }
        if (typeof d?.activityId === "string" && d?.partial) {
          setBulkActivityId(d.activityId);
          try {
            sessionStorage.setItem(SS_BULK_ID, d.activityId);
            sessionStorage.setItem(SS_BULK_PUBLISHED, "1");
          } catch {
            /* ignore */
          }
          fetch(`/api/admin/seva-activities/${d.activityId}`, { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((a: { title?: string } | null) => {
              if (a?.title) {
                setBulkActivityTitle(a.title);
                try {
                  sessionStorage.setItem(SS_BULK_TITLE, a.title);
                } catch {
                  /* ignore */
                }
              }
            })
            .catch(() => {});
          setBulkImportAllowed(true);
        }
        return;
      }
      setBulkOk(typeof d.message === "string" ? d.message : `Imported ${d.imported ?? 0} row(s).`);
      if (typeof d.activityId === "string") {
        setBulkActivityId(d.activityId);
        setBulkImportAllowed(true);
        const t = typeof d.title === "string" ? d.title : null;
        if (t) setBulkActivityTitle(t);
        try {
          sessionStorage.setItem(SS_BULK_ID, d.activityId);
          if (t) sessionStorage.setItem(SS_BULK_TITLE, t);
          sessionStorage.setItem(SS_BULK_PUBLISHED, "1");
        } catch {
          /* ignore */
        }
      }
    } catch (err: unknown) {
      setBulkErrors([{ row: 1, column: "—", message: (err as Error)?.message ?? "Import failed." }]);
    } finally {
      setBulkUploading(false);
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

    if (groupChoice === "__new__" && !newGroupTitle.trim()) {
      setMsg({ kind: "err", text: "Enter a program title, or choose “No grouping”." });
      return;
    }

    setSaving(true);
    try {
      let resolvedGroupId: string | undefined;
      if (groupChoice === "__new__" && newGroupTitle.trim()) {
        const cityVal =
          activityScope === "NATIONAL" && !city.trim()
            ? "National"
            : city.trim();
        const gr = await fetch("/api/admin/seva-activity-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: newGroupTitle.trim(),
            scope: activityScope,
            city: cityVal,
            sevaUsaRegion: activityScope === "REGIONAL" ? sevaUsaRegion.trim() : undefined,
            status,
          }),
        });
        const gd = (await gr.json().catch(() => ({}))) as {
          id?: string;
          title?: string;
          error?: string;
          detail?: string;
        };
        if (!gr.ok) {
          throw new Error(gd?.error || gd?.detail || "Could not create program group.");
        }
        if (typeof gd?.id === "string") {
          resolvedGroupId = gd.id;
          const gTitle =
            typeof gd.title === "string" && gd.title.trim() ? gd.title.trim() : newGroupTitle.trim();
          setProgramGroups((prev) => {
            if (prev.some((p) => p.id === gd.id)) return prev;
            return [...prev, { id: gd.id!, title: gTitle }].sort((a, b) =>
              a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
            );
          });
          setGroupChoice(gd.id);
          setNewGroupTitle("");
        }
      } else if (groupChoice && groupChoice !== "__new__") {
        resolvedGroupId = groupChoice;
      }

      const payload: Record<string, unknown> = {
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

        scope: activityScope,
        sevaUsaRegion: activityScope === "REGIONAL" ? sevaUsaRegion.trim() : undefined,
        city:
          activityScope === "NATIONAL" && !city.trim()
            ? "National"
            : city.trim(),
        locationName: locationName.trim() || undefined,
        address: address.trim() || undefined,

        coordinatorName: coordinatorName.trim() || undefined,
        coordinatorEmail: coordinatorEmail.trim() || undefined,
        coordinatorPhone: coordinatorPhone.trim() || undefined,

        imageUrl: imageUrl.trim() || undefined,

        isActive: active,
        isFeatured: featured,
        allowKids,
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
      if (resolvedGroupId) payload.groupId = resolvedGroupId;

      const res = await fetch("/api/admin/seva-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload as Record<string, unknown>),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Save failed.");
      }

      const createdId = typeof data.id === "string" ? data.id : null;
      if (createdId) {
        const t = typeof data.title === "string" ? data.title : title.trim();
        setBulkActivityId(createdId);
        setBulkActivityTitle(t);
        setBulkImportAllowed(status === "PUBLISHED");
        setBulkErrors(null);
        setBulkOk(null);
        try {
          sessionStorage.setItem(SS_BULK_ID, createdId);
          sessionStorage.setItem(SS_BULK_TITLE, t);
          sessionStorage.setItem(SS_BULK_PUBLISHED, status === "PUBLISHED" ? "1" : "0");
        } catch {
          /* ignore */
        }
      }

      setMsg({ kind: "ok", text: `Saved: ${data.title} (${data.status})` });

      // Clear activity fields after publish so coordinators can add the next seva under the same
      // center/region and program group (group stays in the dropdown; location context is kept).
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
        setLocationName("");
        setAddress("");
        setCoordinatorName("");
        setCoordinatorEmail("");
        setCoordinatorPhone("");
        setImageUrl("");
        setActive(true);
        setFeatured(false);
        setAllowKids(true);
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

            <div className="px-5 py-4">
              <label className="block text-sm font-semibold text-zinc-800">
                Level <span className="text-red-600">*</span>
              </label>
              <p className="mt-1 text-xs text-zinc-600">
                Choose center, regional, or national listing. Only levels allowed for your account appear here
                (Admin / Blog Admin can choose any level they are permitted to post).
              </p>
              <select
                value={activityScope}
                disabled={scopeOptions.length <= 1}
                title={
                  scopeOptions.length <= 1
                    ? "Your role fixes this level. Ask an admin if you need a different level."
                    : undefined
                }
                onChange={(e) => {
                  const v = e.target.value as ActivityScopeUi;
                  setActivityScope(v);
                  if (v === "NATIONAL") setCity((c) => c.trim() || "National");
                  if (v === "REGIONAL")
                    setSevaUsaRegion((r) => r || regionalRegionChoices[0] || "");
                  if (v === "CENTER" && city.trim().toLowerCase() === "national") {
                    setCity("");
                  }
                }}
                className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-700"
              >
                {scopeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {LEVEL_LABELS[opt]}
                  </option>
                ))}
              </select>
              {activityScope === "REGIONAL" && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-zinc-800">
                    USA region <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={sevaUsaRegion}
                    onChange={(e) => setSevaUsaRegion(e.target.value)}
                    className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select region</option>
                    {regionalRegionChoices.map((reg) => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="px-5 py-6">
              <label className="block text-sm font-semibold text-zinc-800">
                {activityScope === "CENTER"
                  ? "City"
                  : activityScope === "REGIONAL"
                    ? "Location / title (listing)"
                    : "Listing label"}{" "}
                <span className="text-red-600">*</span>
              </label>
              {activityScope === "CENTER" &&
                (allowedCities !== null && allowedCities.length > 0 ? (
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
                ))}
              {activityScope === "REGIONAL" && (
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Regional food drive — Southeast"
                  required
                  className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
              {activityScope === "NATIONAL" && (
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="National"
                  required
                  className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
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

              <div className="mt-8 border-t border-emerald-200/80 pt-6">
                <label className="block text-sm font-semibold text-zinc-800">
                  Program / festival grouping (optional)
                </label>
                <p className="mt-1 text-xs text-zinc-600">
                  Link this activity to a named program (e.g. Mahashivarathri). Each activity is still
                  listed and registered separately; grouping only affects how it appears on Find Seva.
                  {activityScope === "REGIONAL" ? (
                    <span className="block pt-1">
                      For regional level, existing programs load after you choose <strong>USA region</strong> above
                      (the location line can differ for each activity).
                    </span>
                  ) : (
                    <span className="block pt-1">
                      Choose <strong>level</strong> and <strong>city</strong> (or national listing) above first so
                      saved programs for that place appear here.
                    </span>
                  )}
                </p>
                <select
                  value={groupChoice}
                  onChange={(e) => {
                    setGroupChoice(e.target.value);
                    if (e.target.value !== "__new__") setNewGroupTitle("");
                  }}
                  className="mt-2 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No grouping</option>
                  {programGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                  <option value="__new__">+ Create new program…</option>
                </select>
                {groupChoice === "__new__" ? (
                  <input
                    value={newGroupTitle}
                    onChange={(e) => setNewGroupTitle(e.target.value)}
                    placeholder="Program title (e.g. Mahashivarathri — Charlotte)"
                    className="mt-3 w-full rounded-md border border-emerald-700/60 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : null}
              </div>
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

                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allowKids}
                    onChange={(e) => setAllowKids(e.target.checked)}
                    className="h-6 w-6 accent-indigo-600"
                  />
                  <span className="text-lg font-semibold text-indigo-950">
                    Allow kids in Join Seva
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

        <section className="mt-10 overflow-hidden rounded-none border-2 border-indigo-200/90 bg-gradient-to-br from-white to-indigo-50/50 p-6 shadow-[0_14px_30px_rgba(79,70,160,0.15)] md:p-8">
            <h2 className="text-xl font-black tracking-tight text-indigo-900 md:text-2xl">
              Download Excel template &amp; bulk import
            </h2>
            {bulkActivityId && bulkActivityTitle && (
              <p className="mt-2 text-sm font-semibold text-indigo-800">
                Last activity saved from this page:{" "}
                <span className="text-zinc-900">{bulkActivityTitle}</span>
              </p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-zinc-700">
              The workbook has four tabs (plus a hidden <code className="rounded bg-indigo-100/90 px-1">_Lists</code> sheet for dropdowns):{" "}
              <strong>Instructions</strong>, <strong>Add Seva Activity</strong> (activity fields + summary),{" "}
              <strong>Contribution items</strong> (full item list for the activity — max, names, new rows without Item ID; if any row has an Item ID, the sheet replaces the ordered list like Manage Seva), and{" "}
              <strong>Join Seva Activity</strong> (fourth tab: one row per person; each <code className="rounded bg-indigo-100/90 px-1">item__…</code> column maps a contribution item to
              that individual with a quantity — many items on the same row, no repeated name/email).
            </p>
            {bulkActivityId ? (
              <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                <strong>Download</strong> fills <strong>Add Seva Activity</strong>, <strong>Contribution items</strong> (with claimed totals), and every registered member on{" "}
                <strong>Join Seva Activity</strong> with item quantities. Re-download after editing the activity or items in <strong>Manage Seva → Edit</strong>. This browser remembers the last activity
                you saved from this page until you save another one here.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                <strong>Download</strong> now for a <strong>blank</strong> template (Add Seva Activity headers + sample Join Seva Activity row; no{" "}
                <code className="rounded bg-indigo-100/90 px-1">item__</code> columns until you save an activity here). After saving, download again to get contribution-item
                columns and all current sign-ups.
              </p>
            )}
            {!bulkActivityId && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                <strong>Upload filled Excel</strong> without saving the form first will <strong>create a new published seva activity</strong> from <strong>Add Seva Activity</strong> row 2, then sync{" "}
                <strong>Contribution items</strong> (if any) and import <strong>Join Seva Activity</strong> rows. The activity appears in <strong>Manage Seva</strong> and public <strong>View details</strong> like any other published activity.
              </p>
            )}
            {bulkActivityId && bulkImportAllowed && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                <strong>Upload filled Excel</strong> updates the <strong>last published activity</strong> saved from this page: applies <strong>Add Seva Activity</strong> row 2, syncs{" "}
                <strong>Contribution items</strong> (append-only when every Item ID is blank), then imports <strong>Join Seva Activity</strong> rows. Volunteer confirmation emails and Manage Seva listings match the website.
              </p>
            )}
            {bulkActivityId && !bulkImportAllowed && (
              <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
                <strong>Upload</strong> on this page is set to update your <strong>saved draft</strong> after you <strong>Save &amp; Publish</strong>. To create everything from Excel only, use{" "}
                <strong>Upload</strong> from Add Seva in a session where you have <strong>not</strong> saved a draft here, or publish this draft first.
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={downloadBulkTemplate}
                disabled={saving}
                className="cursor-pointer rounded-lg border-2 border-indigo-400 bg-white px-5 py-3 text-sm font-bold text-indigo-900 shadow-sm hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download Excel template
              </button>
              {/*
                Overlay the file input on the control so the OS file picker opens from a direct
                user click (reliable across browsers). Programmatic input.click() is often blocked.
              */}
              <label
                className={`relative inline-flex items-center justify-center overflow-hidden rounded-lg px-5 py-3 text-sm font-bold text-white shadow ${
                  bulkUploading || saving
                    ? "pointer-events-none cursor-not-allowed opacity-60 bg-zinc-500"
                    : bulkActivityId && !bulkImportAllowed
                      ? "cursor-not-allowed bg-zinc-500 hover:bg-zinc-600"
                      : "cursor-pointer bg-indigo-800 hover:bg-indigo-900"
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="absolute inset-0 z-10 h-full min-h-[44px] w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  disabled={bulkUploading || saving || (Boolean(bulkActivityId) && !bulkImportAllowed)}
                  onChange={handleBulkUpload}
                  aria-label="Choose Excel file to upload"
                />
                <span className="pointer-events-none relative z-0 select-none">
                  {bulkUploading ? "Uploading…" : "Upload filled Excel"}
                </span>
              </label>
              {bulkActivityId ? (
                <>
                  <Link
                    href={`/admin/seva-signups?activityId=${encodeURIComponent(bulkActivityId)}`}
                    className="text-sm font-bold text-indigo-800 underline hover:text-indigo-950"
                  >
                    View sign-ups →
                  </Link>
                  <Link
                    href={`/admin/manage-seva/${bulkActivityId}`}
                    className="text-sm font-bold text-indigo-800 underline hover:text-indigo-950"
                  >
                    Edit activity →
                  </Link>
                </>
              ) : null}
            </div>
            {bulkOk && (
              <p className="mt-5 rounded-md border border-emerald-400 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950">
                {bulkOk}
              </p>
            )}
            {bulkErrors && bulkErrors.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-md border-2 border-red-300 bg-red-50/95">
                <p className="border-b border-red-200 px-4 py-2 text-sm font-bold text-red-950">
                  Fix the issues below (row = Excel row number).
                </p>
                <table className="min-w-full text-left text-sm text-red-950">
                  <thead>
                    <tr className="border-b border-red-200 bg-red-100/90">
                      <th className="px-4 py-2 font-bold">Row</th>
                      <th className="px-4 py-2 font-bold">Column</th>
                      <th className="px-4 py-2 font-bold">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkErrors.map((err, i) => (
                      <tr key={i} className="border-b border-red-100">
                        <td className="whitespace-nowrap px-4 py-2 font-mono">{err.row}</td>
                        <td className="whitespace-nowrap px-4 py-2 font-mono">{err.column}</td>
                        <td className="px-4 py-2">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        {/* bottom spacer so footer never feels stuck */}
        <div className="mt-10 h-6" />
      </div>
    </div>
  );
}