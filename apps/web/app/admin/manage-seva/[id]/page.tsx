"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CITIES } from "@/lib/cities";
import { SEVA_CATEGORIES } from "@/lib/categories";
import {
  ContributionItemsEditor,
  type ContributionRow,
} from "@/app/_components/ContributionItemsEditor";

type ContributionClaim = {
  id: string;
  quantity: number;
  volunteerName: string;
  email: string;
  phone: string | null;
  createdAt: string;
};

type ContributionItemWithClaims = {
  id: string;
  name: string;
  category: string;
  neededLabel: string;
  maxQuantity: number;
  claims: ContributionClaim[];
};

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
  contributionItems?: Array<{
    id: string;
    name: string;
    category: string;
    neededLabel: string;
    maxQuantity: number;
    claims?: ContributionClaim[];
  }>;
};

/** Split API contribution items into editor rows + full list with volunteer claims ("I will bring"). */
function mapContributionItemsFromApi(items: unknown): {
  editorRows: ContributionRow[];
  withClaims: ContributionItemWithClaims[];
} {
  if (!Array.isArray(items)) return { editorRows: [], withClaims: [] };
  const withClaims: ContributionItemWithClaims[] = items.map((it: Record<string, unknown>) => {
    const rawClaims = it.claims;
    const claims: ContributionClaim[] = Array.isArray(rawClaims)
      ? rawClaims.map((c: Record<string, unknown>) => {
          const created = c.createdAt;
          const createdAt =
            typeof created === "string"
              ? created
              : created instanceof Date
                ? created.toISOString()
                : String(created ?? "");
          return {
            id: String(c.id ?? ""),
            quantity: Math.max(1, Number(c.quantity) || 1),
            volunteerName: String(c.volunteerName ?? ""),
            email: String(c.email ?? ""),
            phone: c.phone != null ? String(c.phone) : null,
            createdAt,
          };
        })
      : [];
    return {
      id: String(it.id ?? ""),
      name: String(it.name ?? ""),
      category: String(it.category ?? ""),
      neededLabel: String(it.neededLabel ?? ""),
      maxQuantity: Math.max(1, Number(it.maxQuantity) || 1),
      claims,
    };
  });
  const editorRows: ContributionRow[] = withClaims.map(({ id, name, category, neededLabel, maxQuantity }) => ({
    id,
    name,
    category,
    neededLabel,
    maxQuantity,
  }));
  return { editorRows, withClaims };
}

/** One row per requested item — totals for summary grid. */
type ItemSummaryGridRow = {
  itemId: string;
  itemName: string;
  category: string;
  neededLabel: string;
  maxQuantity: number;
  claimedQty: number;
  signUpCount: number;
};

/** One row per volunteer line (flattened for main datagrid). */
type ItemSignUpGridRow = {
  claimId: string;
  itemId: string;
  itemName: string;
  itemCategory: string;
  neededLabel: string;
  itemMax: number;
  volunteerName: string;
  email: string;
  phone: string | null;
  quantity: number;
  createdAt: string;
};

type SortDir = "asc" | "desc";

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

function minFutureDateInputValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function suggestedCloneDatesFromForm(formStart: string, formEnd: string): { start: string; end: string } {
  const startDefault = minFutureDateInputValue();
  const startKey = formStart?.trim().slice(0, 10) || "";
  const endKey = formEnd?.trim().slice(0, 10) || "";
  if (!startKey || !endKey || !/^\d{4}-\d{2}-\d{2}$/.test(startKey) || !/^\d{4}-\d{2}-\d{2}$/.test(endKey)) {
    return { start: startDefault, end: startDefault };
  }
  let diffDays = 0;
  if (endKey >= startKey) {
    diffDays = Math.round(
      (new Date(endKey + "T12:00:00Z").getTime() - new Date(startKey + "T12:00:00Z").getTime()) / 86400000
    );
  }
  const endD = new Date(startDefault + "T12:00:00Z");
  endD.setUTCDate(endD.getUTCDate() + diffDays);
  return { start: startDefault, end: endD.toISOString().slice(0, 10) };
}

function combineLocalDateTime(dateStr: string, timeStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return null;
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function EditSevaActivityPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const isCloneMode = searchParams.get("mode") === "clone";

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

  const [cloneSubmitting, setCloneSubmitting] = useState(false);
  const [cloneSeeded, setCloneSeeded] = useState(false);

  const [contributionItems, setContributionItems] = useState<ContributionRow[]>([]);
  /** Volunteer "I will bring" sign-ups (from API; refreshed on load & after save). */
  const [itemContributionSignups, setItemContributionSignups] = useState<ContributionItemWithClaims[]>([]);

  const canSave = useMemo(() => title.trim() && category.trim() && city.trim(), [title, category, city]);

  const itemBringStats = useMemo(() => {
    let claimRows = 0;
    let filledQty = 0;
    let totalCapacity = 0;
    for (const it of itemContributionSignups) {
      totalCapacity += it.maxQuantity;
      for (const c of it.claims) {
        claimRows += 1;
        filledQty += c.quantity;
      }
    }
    return { claimRows, filledQty, totalCapacity, hasItems: itemContributionSignups.length > 0 };
  }, [itemContributionSignups]);

  const itemSummaryGridRows = useMemo((): ItemSummaryGridRow[] => {
    return itemContributionSignups.map((it) => {
      const claimedQty = it.claims.reduce((s, c) => s + c.quantity, 0);
      return {
        itemId: it.id,
        itemName: it.name,
        category: it.category,
        neededLabel: it.neededLabel,
        maxQuantity: it.maxQuantity,
        claimedQty,
        signUpCount: it.claims.length,
      };
    });
  }, [itemContributionSignups]);

  const itemSignUpGridRows = useMemo((): ItemSignUpGridRow[] => {
    const rows: ItemSignUpGridRow[] = [];
    for (const it of itemContributionSignups) {
      for (const c of it.claims) {
        rows.push({
          claimId: c.id,
          itemId: it.id,
          itemName: it.name,
          itemCategory: it.category,
          neededLabel: it.neededLabel,
          itemMax: it.maxQuantity,
          volunteerName: c.volunteerName,
          email: c.email,
          phone: c.phone,
          quantity: c.quantity,
          createdAt: c.createdAt,
        });
      }
    }
    return rows;
  }, [itemContributionSignups]);

  const [summarySort, setSummarySort] = useState<{
    key: keyof ItemSummaryGridRow;
    dir: SortDir;
  }>({ key: "itemName", dir: "asc" });

  const [detailSort, setDetailSort] = useState<{
    key: keyof ItemSignUpGridRow;
    dir: SortDir;
  }>({ key: "createdAt", dir: "desc" });

  const [signUpGridFilter, setSignUpGridFilter] = useState("");

  const sortedSummaryRows = useMemo(() => {
    const copy = [...itemSummaryGridRows];
    const { key, dir } = summarySort;
    copy.sort((a, b) => {
      let cmp = 0;
      const va = a[key];
      const vb = b[key];
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va ?? "").localeCompare(String(vb ?? ""), undefined, { sensitivity: "base" });
      return dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [itemSummaryGridRows, summarySort]);

  const sortedFilteredDetailRows = useMemo(() => {
    const q = signUpGridFilter.trim().toLowerCase();
    let rows = itemSignUpGridRows;
    if (q) {
      rows = rows.filter((r) =>
        [
          r.itemName,
          r.itemCategory,
          r.neededLabel,
          r.volunteerName,
          r.email,
          r.phone ?? "",
          String(r.quantity),
        ].some((x) => x.toLowerCase().includes(q))
      );
    }
    const copy = [...rows];
    const { key, dir } = detailSort;
    copy.sort((a, b) => {
      let cmp = 0;
      if (key === "createdAt") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        const va = a[key];
        const vb = b[key];
        if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
        else cmp = String(va ?? "").localeCompare(String(vb ?? ""), undefined, { sensitivity: "base" });
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [itemSignUpGridRows, signUpGridFilter, detailSort]);

  function toggleSummarySort(key: keyof ItemSummaryGridRow) {
    setSummarySort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  function toggleDetailSort(key: keyof ItemSignUpGridRow) {
    setDetailSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  function sortMark(active: boolean, dir: SortDir): string {
    if (!active) return "";
    return dir === "asc" ? "▲" : "▼";
  }

  const loadActivity = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/seva-activities/${id}`, {
        cache: "no-store",
        credentials: "include",
      });
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

      const { editorRows, withClaims } = mapContributionItemsFromApi(a.contributionItems);
      setContributionItems(editorRows);
      setItemContributionSignups(withClaims);
    } catch (e: unknown) {
      setLoadError((e as Error)?.message ?? "Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    setCloneSeeded(false);
  }, [id, isCloneMode]);

  useEffect(() => {
    if (loading || !isCloneMode || cloneSeeded) return;
    const { start, end } = suggestedCloneDatesFromForm(startDate, endDate);
    setStartDate(start);
    setEndDate(end);
    setActive(true);
    setStatus("PUBLISHED");
    setFeatured(false);
    setMsg(null);
    setCloneSeeded(true);
  }, [loading, isCloneMode, cloneSeeded, startDate, endDate]);

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
        contributionItems: contributionItems
          .filter((r) => r.name.trim())
          .map((r) => ({
            ...(r.id ? { id: r.id } : {}),
            name: r.name.trim(),
            category: r.category.trim(),
            neededLabel: r.neededLabel.trim(),
            maxQuantity: r.maxQuantity,
          })),
      };
      const res = await fetch(`/api/admin/seva-activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || "Save failed.");
      setMsg({ kind: "ok", text: `Saved: ${data.title}` });
      if (Array.isArray(data.contributionItems)) {
        const { editorRows, withClaims } = mapContributionItemsFromApi(data.contributionItems);
        setContributionItems(editorRows);
        setItemContributionSignups(withClaims);
      }
    } catch (e: unknown) {
      setMsg({ kind: "err", text: (e as Error)?.message || "Internal error." });
    } finally {
      setSaving(false);
    }
  }

  async function submitCloneFromForm() {
    setMsg(null);
    if (!title.trim() || !category.trim() || !city.trim()) {
      setMsg({ kind: "err", text: "Please fill required fields: Seva Activity, Category, and City." });
      return;
    }
    if (!startTime || !endTime) {
      setMsg({ kind: "err", text: "Start time and end time are required in Clone Seva Activity." });
      return;
    }
    if (!address.trim()) {
      setMsg({ kind: "err", text: "Address is required in Clone Seva Activity." });
      return;
    }
    if (!coordinatorName.trim() || !coordinatorEmail.trim() || !coordinatorPhone.trim()) {
      setMsg({
        kind: "err",
        text: "Coordinator name, email, and phone are required in Clone Seva Activity.",
      });
      return;
    }
    if (!capacity.trim() || !Number.isFinite(Number(capacity)) || !Number.isInteger(Number(capacity)) || Number(capacity) < 1) {
      setMsg({
        kind: "err",
        text: "Capacity is required and must be a whole number of at least 1.",
      });
      return;
    }
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      setMsg({ kind: "err", text: "Duration (hours) must be greater than 0." });
      return;
    }
    if (!startDate || !endDate) {
      setMsg({ kind: "err", text: "Start date and end date are required." });
      return;
    }
    const now = new Date();
    const startAt = combineLocalDateTime(startDate, startTime);
    const endAt = combineLocalDateTime(endDate, endTime);
    if (!startAt || !endAt) {
      setMsg({ kind: "err", text: "Please enter valid start and end date/time." });
      return;
    }
    if (startAt <= now) {
      setMsg({
        kind: "err",
        text: "Start date/time must be later than the current time. Today is allowed if start time is in the future.",
      });
      return;
    }
    if (endAt <= now) {
      setMsg({ kind: "err", text: "End date/time must be later than the current time." });
      return;
    }
    if (endAt <= startAt) {
      setMsg({ kind: "err", text: "End date/time must be later than start date/time." });
      return;
    }
    setCloneSubmitting(true);
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
        isActive: true,
        isFeatured: false,
        status: "PUBLISHED" as const,
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
      if (!res.ok) throw new Error(data?.detail || data?.error || "Clone failed.");
      const newTitle = typeof data?.title === "string" ? data.title : "New activity";
      setMsg({
        kind: "ok",
        text: `Cloned successfully: ${newTitle}. This page stays on the source activity so you can submit another clone if needed.`,
      });
    } catch (e: unknown) {
      setMsg({ kind: "err", text: (e as Error)?.message || "Clone failed." });
    } finally {
      setCloneSubmitting(false);
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
      <div className="flex min-h-[50vh] items-center justify-center bg-[radial-gradient(circle_at_35%_15%,rgba(255,255,255,0.75),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(90,140,240,0.75),rgba(200,210,235,0.7),rgba(190,170,210,0.75))]">
        <p className="rounded-lg border border-indigo-200/80 bg-white/90 px-6 py-4 text-lg font-semibold text-indigo-900 shadow-md">
          Loading activity…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[50vh] bg-[radial-gradient(circle_at_35%_15%,rgba(255,255,255,0.75),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(90,140,240,0.75),rgba(200,210,235,0.7),rgba(190,170,210,0.75))] px-4 py-10">
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-white/95 px-6 py-8 text-center shadow-lg">
          <p className="text-red-800">{loadError}</p>
          <div className="mt-6">
            <Link
              href="/admin/manage-seva"
              className="font-semibold text-indigo-700 underline hover:text-indigo-900"
            >
              ← Back to Manage Seva
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_35%_15%,rgba(255,255,255,0.75),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(90,140,240,0.75),rgba(200,210,235,0.7),rgba(190,170,210,0.75))]">
      {/* Hero — matches Manage Seva list + Seva admin gradient strip */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 border-t border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
        <div className="relative">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(95,90,170,0.92),rgba(120,120,140,0.78),rgba(190,180,90,0.78))]" />
          <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10">
            <Link
              href="/admin/manage-seva"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/95 underline-offset-4 transition hover:text-white hover:underline"
            >
              ← Back to Manage Seva
            </Link>
            <div className="mt-5">
              <h1 className="text-4xl font-extrabold italic tracking-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)] md:text-5xl lg:text-6xl">
                {isCloneMode ? "CLONE SEVA ACTIVITY" : "EDIT SEVA ACTIVITY"}
              </h1>
              <div className="mt-3">
                {isCloneMode ? (
                  <Link
                    href={`/admin/manage-seva/${id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm hover:bg-white/25"
                  >
                    Switch to Edit Activity
                  </Link>
                ) : (
                  <Link
                    href={`/admin/manage-seva/${id}?mode=clone`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm hover:bg-white/25"
                  >
                    Switch to Clone Activity
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="h-1 w-full bg-cyan-300/65" />
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8">
        {itemBringStats.hasItems && (
          <div
            className={[
              "mt-6 rounded-xl border px-5 py-4 shadow-md",
              itemBringStats.claimRows > 0
                ? "border-emerald-600/80 bg-emerald-50/95 text-emerald-950"
                : "border-amber-200/90 bg-amber-50/90 text-amber-950",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p
                  className={
                    itemBringStats.claimRows > 0
                      ? "text-sm font-bold uppercase tracking-wide text-emerald-900/80"
                      : "text-sm font-bold uppercase tracking-wide text-amber-900/80"
                  }
                >
                  Join Seva — I will bring
                </p>
                <p className="mt-1 text-base font-semibold">
                  {itemBringStats.claimRows > 0 ? (
                    <>
                      {itemBringStats.claimRows} volunteer sign-up
                      {itemBringStats.claimRows === 1 ? "" : "s"} · {itemBringStats.filledQty} /{" "}
                      {itemBringStats.totalCapacity} units claimed
                    </>
                  ) : (
                    <>No volunteers have chosen &quot;I will bring&quot; yet for this activity.</>
                  )}
                </p>
              </div>
              <Link
                href={`/admin/seva-activities/${id}/item-contributions`}
                className="shrink-0 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-900"
              >
                Full list & filters →
              </Link>
            </div>
          </div>
        )}

        <section className="mt-2 grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-indigo-200/70 bg-white/95 shadow-[0_14px_34px_rgba(79,70,160,0.18)] ring-1 ring-indigo-100/80">
            <div className="border-b border-indigo-100/80 bg-gradient-to-r from-indigo-100/95 via-sky-50/90 to-indigo-50/70 px-5 py-4">
              <label className="mt-1 block text-sm font-semibold text-zinc-800">Seva Activity <span className="text-red-600">*</span></label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-md border border-indigo-300/70 bg-white px-4 py-3 text-zinc-900 outline-none ring-0 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400/50" />
            </div>
            <div className="bg-gradient-to-br from-white to-slate-50/50 px-5 py-5">
              <label className="block text-sm font-semibold text-zinc-800">Find Seva (Service Category) <span className="text-red-600">*</span></label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-400/40">
                <option value="">Select</option>
                {SEVA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="border-y border-amber-100/90 bg-gradient-to-r from-amber-50/95 via-yellow-50/80 to-amber-100/60 px-5 py-5">
              <label className="block text-sm font-semibold text-zinc-800">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="mt-2 w-full resize-none rounded-md border border-amber-200/80 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400/45" />
            </div>
            <div className="px-5 py-6">
              <label className="block text-sm font-semibold text-zinc-800">Capacity</label>
              <input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="# Volunteers Required" className="mt-2 w-full max-w-[360px] rounded-md border border-emerald-200/90 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-400/50" />
            </div>
            <div className="border-t border-emerald-100/90 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-cyan-50/60 px-5 py-5">
              <label className="inline-flex w-full max-w-[420px] cursor-pointer items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 px-6 py-4 text-base font-semibold text-white shadow-md hover:from-emerald-800 hover:to-teal-800 disabled:opacity-60">
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
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/uploads/... or https://..." className="mt-2 w-full rounded-md border border-emerald-200/90 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-400/45" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-amber-200/70 bg-white/95 shadow-[0_14px_34px_rgba(180,130,40,0.14)] ring-1 ring-amber-100/80">
            <div className="border-b border-amber-100/90 bg-gradient-to-r from-amber-100/90 via-orange-50/85 to-rose-50/70 px-5 py-6">
              <div className="mt-3 grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-zinc-800">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-400/45" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-800">Start Time</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-400/45" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-800">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-400/45" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-800">End Time</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-400/45" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-zinc-800">Duration (hours)</label>
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" aria-label="Decrease duration" onClick={() => setDurationHours((h) => Math.max(0, h - 0.5))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-300/90 bg-white text-xl font-bold text-amber-900 shadow-sm hover:bg-amber-50">−</button>
                    <input type="number" min={0} step={0.5} value={durationHours} onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v) && v >= 0) setDurationHours(v); }} className="w-24 rounded-lg border border-amber-200 bg-white px-4 py-3 text-center text-zinc-900 outline-none [appearance:textfield] focus:ring-2 focus:ring-amber-400/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <button type="button" aria-label="Increase duration" onClick={() => setDurationHours((h) => h + 0.5)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-300/90 bg-white text-xl font-bold text-amber-900 shadow-sm hover:bg-amber-50">+</button>
                    <span className="text-sm font-medium text-amber-900/80">hrs</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-b from-white to-violet-50/40 px-5 py-6">
              <label className="block text-sm font-semibold text-zinc-800">City <span className="text-red-600">*</span></label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-2 w-full rounded-lg border border-violet-200/90 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-violet-400/45">
                <option value="">Select city</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <label className="mt-5 block text-sm font-semibold text-zinc-800">Location Name</label>
              <input value={locationName} onChange={(e) => setLocationName(e.target.value)} className="mt-2 w-full rounded-lg border border-violet-200/90 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-violet-400/45" />
              <label className="mt-5 block text-sm font-semibold text-zinc-800">Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={6} className="mt-2 w-full resize-none rounded-lg border border-violet-200/90 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-violet-400/45" />
            </div>
          </div>
        </section>

        <section className="mt-10 overflow-hidden rounded-xl border border-emerald-200/70 bg-white/95 shadow-[0_14px_34px_rgba(20,120,90,0.12)] ring-1 ring-emerald-100/70">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-600 px-5 py-4 md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-100/95">Volunteers bring</p>
              <h2 className="text-xl font-bold text-white drop-shadow-sm md:text-2xl">Item contribution list</h2>
            </div>
            <Link
              href={`/admin/seva-activities/${id}/item-contributions`}
              className="rounded-lg border border-white/40 bg-white/15 px-4 py-2.5 text-sm font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25"
            >
              View volunteer sign-ups →
            </Link>
          </div>
          <div className="p-6 md:p-8">

          {itemBringStats.hasItems && (
            <div className="mb-8 space-y-8 rounded-lg border border-emerald-200 bg-emerald-50/50 p-5">
              <div>
                <h3 className="text-lg font-bold text-emerald-950">Signed items — summary (datagrid)</h3>
                <p className="mt-1 text-sm text-emerald-900/80">
                  Totals per requested item from <strong>Join Seva</strong> (&quot;I will bring&quot;). Click column
                  headers to sort. Refreshes when you save or reload this page.
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-zinc-300 bg-white shadow-sm">
                <table className="min-w-[720px] w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-[1] bg-zinc-800 text-white">
                    <tr>
                      <th className="border-b border-zinc-600 px-3 py-3 font-semibold">
                        <button
                          type="button"
                          className="flex w-full items-center gap-1 text-left hover:text-emerald-200"
                          onClick={() => toggleSummarySort("itemName")}
                        >
                          Item {sortMark(summarySort.key === "itemName", summarySort.dir)}
                        </button>
                      </th>
                      <th className="border-b border-zinc-600 px-3 py-3 font-semibold">
                        <button
                          type="button"
                          className="flex w-full items-center gap-1 text-left hover:text-emerald-200"
                          onClick={() => toggleSummarySort("category")}
                        >
                          Category {sortMark(summarySort.key === "category", summarySort.dir)}
                        </button>
                      </th>
                      <th className="border-b border-zinc-600 px-3 py-3 font-semibold">Needed</th>
                      <th className="border-b border-zinc-600 px-3 py-3 font-semibold text-right">
                        <button
                          type="button"
                          className="ml-auto flex items-center gap-1 hover:text-emerald-200"
                          onClick={() => toggleSummarySort("claimedQty")}
                        >
                          Claimed {sortMark(summarySort.key === "claimedQty", summarySort.dir)}
                        </button>
                      </th>
                      <th className="border-b border-zinc-600 px-3 py-3 font-semibold text-right">
                        <button
                          type="button"
                          className="ml-auto flex items-center gap-1 hover:text-emerald-200"
                          onClick={() => toggleSummarySort("maxQuantity")}
                        >
                          Max {sortMark(summarySort.key === "maxQuantity", summarySort.dir)}
                        </button>
                      </th>
                      <th className="border-b border-zinc-600 px-3 py-3 font-semibold text-right">
                        <button
                          type="button"
                          className="ml-auto flex items-center gap-1 hover:text-emerald-200"
                          onClick={() => toggleSummarySort("signUpCount")}
                        >
                          # Sign-ups {sortMark(summarySort.key === "signUpCount", summarySort.dir)}
                        </button>
                      </th>
                      <th className="border-b border-zinc-600 px-3 py-3 font-semibold">Fill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSummaryRows.map((row, i) => {
                      const pct =
                        row.maxQuantity > 0
                          ? Math.min(100, Math.round((row.claimedQty / row.maxQuantity) * 100))
                          : 0;
                      return (
                        <tr
                          key={row.itemId}
                          className={i % 2 === 0 ? "bg-white hover:bg-emerald-50/40" : "bg-zinc-50/80 hover:bg-emerald-50/40"}
                        >
                          <td className="border-b border-zinc-200 px-3 py-2.5 font-semibold text-zinc-900">
                            {row.itemName}
                          </td>
                          <td className="border-b border-zinc-200 px-3 py-2.5 text-zinc-700">
                            {row.category || "—"}
                          </td>
                          <td className="border-b border-zinc-200 px-3 py-2.5 text-zinc-600">
                            {row.neededLabel || "—"}
                          </td>
                          <td className="border-b border-zinc-200 px-3 py-2.5 text-right tabular-nums font-medium text-emerald-800">
                            {row.claimedQty}
                          </td>
                          <td className="border-b border-zinc-200 px-3 py-2.5 text-right tabular-nums text-zinc-700">
                            {row.maxQuantity}
                          </td>
                          <td className="border-b border-zinc-200 px-3 py-2.5 text-right tabular-nums text-zinc-700">
                            {row.signUpCount}
                          </td>
                          <td className="border-b border-zinc-200 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 min-w-[64px] flex-1 overflow-hidden rounded-full bg-zinc-200">
                                <div
                                  className="h-full rounded-full bg-emerald-600"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-xs font-medium text-zinc-600">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-950">All volunteer line items (datagrid)</h3>
                    <p className="mt-1 text-sm text-emerald-900/80">
                      One row per volunteer commitment. Use search to filter by name, email, item, or category.
                    </p>
                  </div>
                  <label className="flex min-w-[220px] flex-1 flex-col text-xs font-semibold text-zinc-700 sm:max-w-sm">
                    Search
                    <input
                      value={signUpGridFilter}
                      onChange={(e) => setSignUpGridFilter(e.target.value)}
                      placeholder="Filter rows…"
                      className="mt-1 rounded-md border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>
                </div>

                {itemBringStats.claimRows === 0 ? (
                  <p className="mt-4 text-sm font-medium text-zinc-700">
                    No sign-ups yet. When volunteers choose items, every commitment appears in the grid below.
                  </p>
                ) : (
                  <div className="mt-4 max-h-[min(520px,70vh)] overflow-auto rounded-lg border border-zinc-300 bg-white shadow-sm">
                    <table className="min-w-[960px] w-full border-collapse text-left text-sm">
                      <thead className="sticky top-0 z-[1] bg-zinc-800 text-white shadow-sm">
                        <tr>
                          <th className="border-b border-zinc-600 px-3 py-3 font-semibold">
                            <button
                              type="button"
                              className="flex w-full items-center gap-1 text-left hover:text-emerald-200"
                              onClick={() => toggleDetailSort("itemName")}
                            >
                              Item {sortMark(detailSort.key === "itemName", detailSort.dir)}
                            </button>
                          </th>
                          <th className="border-b border-zinc-600 px-3 py-3 font-semibold">
                            <button
                              type="button"
                              className="flex w-full items-center gap-1 text-left hover:text-emerald-200"
                              onClick={() => toggleDetailSort("itemCategory")}
                            >
                              Category {sortMark(detailSort.key === "itemCategory", detailSort.dir)}
                            </button>
                          </th>
                          <th className="border-b border-zinc-600 px-3 py-3 font-semibold">Needed</th>
                          <th className="border-b border-zinc-600 px-3 py-3 font-semibold">
                            <button
                              type="button"
                              className="flex w-full items-center gap-1 text-left hover:text-emerald-200"
                              onClick={() => toggleDetailSort("volunteerName")}
                            >
                              Volunteer {sortMark(detailSort.key === "volunteerName", detailSort.dir)}
                            </button>
                          </th>
                          <th className="border-b border-zinc-600 px-3 py-3 font-semibold text-right">
                            <button
                              type="button"
                              className="ml-auto flex items-center gap-1 hover:text-emerald-200"
                              onClick={() => toggleDetailSort("quantity")}
                            >
                              Qty {sortMark(detailSort.key === "quantity", detailSort.dir)}
                            </button>
                          </th>
                          <th className="border-b border-zinc-600 px-3 py-3 font-semibold">
                            <button
                              type="button"
                              className="flex w-full items-center gap-1 text-left hover:text-emerald-200"
                              onClick={() => toggleDetailSort("email")}
                            >
                              Email {sortMark(detailSort.key === "email", detailSort.dir)}
                            </button>
                          </th>
                          <th className="border-b border-zinc-600 px-3 py-3 font-semibold">Phone</th>
                          <th className="border-b border-zinc-600 px-3 py-3 font-semibold">
                            <button
                              type="button"
                              className="flex w-full items-center gap-1 text-left hover:text-emerald-200"
                              onClick={() => toggleDetailSort("createdAt")}
                            >
                              Signed up {sortMark(detailSort.key === "createdAt", detailSort.dir)}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedFilteredDetailRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-8 text-center text-zinc-600">
                              No rows match your search.
                            </td>
                          </tr>
                        ) : (
                          sortedFilteredDetailRows.map((r, i) => (
                            <tr
                              key={r.claimId}
                              className={
                                i % 2 === 0
                                  ? "bg-white hover:bg-emerald-50/50"
                                  : "bg-zinc-50/90 hover:bg-emerald-50/50"
                              }
                            >
                              <td className="border-b border-zinc-200 px-3 py-2.5 font-medium text-zinc-900">
                                {r.itemName}
                              </td>
                              <td className="border-b border-zinc-200 px-3 py-2.5 text-zinc-700">
                                {r.itemCategory || "—"}
                              </td>
                              <td className="border-b border-zinc-200 px-3 py-2.5 text-zinc-600">
                                {r.neededLabel || "—"}
                              </td>
                              <td className="border-b border-zinc-200 px-3 py-2.5 text-zinc-900">
                                {r.volunteerName}
                              </td>
                              <td className="border-b border-zinc-200 px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-800">
                                {r.quantity}
                              </td>
                              <td className="border-b border-zinc-200 px-3 py-2.5 text-zinc-700">{r.email}</td>
                              <td className="border-b border-zinc-200 px-3 py-2.5 text-zinc-600">
                                {r.phone ?? "—"}
                              </td>
                              <td className="border-b border-zinc-200 px-3 py-2.5 whitespace-nowrap text-zinc-600">
                                {r.createdAt
                                  ? new Date(r.createdAt).toLocaleString(undefined, {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    })
                                  : "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {itemBringStats.claimRows > 0 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Showing {sortedFilteredDetailRows.length} of {itemSignUpGridRows.length} row
                    {itemSignUpGridRows.length === 1 ? "" : "s"}.
                  </p>
                )}
              </div>
            </div>
          )}

          <ContributionItemsEditor
            items={contributionItems}
            onChange={setContributionItems}
            disabled={saving}
          />
          <p className="mt-4 text-xs text-zinc-500">
            Save changes on this page to update the list. Volunteers see updates on the Seva Activities page after you save.
          </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="overflow-hidden rounded-xl border border-indigo-200/75 bg-gradient-to-br from-indigo-50/95 via-white to-violet-50/70 shadow-[0_14px_34px_rgba(70,60,140,0.14)] ring-1 ring-indigo-100/80">
            <div className="border-b border-indigo-100/80 bg-gradient-to-r from-indigo-600/92 via-violet-600/88 to-indigo-700/90 px-6 py-4 md:px-8">
              <h2 className="text-lg font-bold text-white drop-shadow-sm md:text-xl">Coordinator</h2>
            </div>
            <div className="px-6 py-8 md:px-8">
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-indigo-800">Coordinator Name</label>
                  <input value={coordinatorName} onChange={(e) => setCoordinatorName(e.target.value)} className="mt-2 w-full rounded-lg border border-indigo-200 bg-white/90 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-400/45" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-indigo-800">Coordinator Email</label>
                  <input value={coordinatorEmail} onChange={(e) => setCoordinatorEmail(e.target.value)} placeholder="example@domain.com" className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-400/45" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-indigo-800">Coordinator Phone</label>
                  <input value={coordinatorPhone} onChange={(e) => setCoordinatorPhone(e.target.value)} className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-400/45" />
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
                    className="mt-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-zinc-900 focus:ring-2 focus:ring-violet-400/40"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>
              {msg && (
                <div
                  className={[
                    "mt-6 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm",
                    msg.kind === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-900",
                  ].join(" ")}
                >
                  {msg.text}
                </div>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-6">
                {!isCloneMode ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveChanges}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-700 to-teal-700 px-10 py-5 text-xl font-semibold tracking-wide text-white shadow-md hover:from-emerald-800 hover:to-teal-800 disabled:opacity-70"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving || cloneSubmitting}
                    onClick={submitCloneFromForm}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-700 to-violet-700 px-10 py-5 text-xl font-semibold tracking-wide text-white shadow-md hover:from-indigo-800 hover:to-violet-800 disabled:opacity-70"
                  >
                    {cloneSubmitting ? "Creating clone..." : "Submit clone"}
                  </button>
                )}
                <Link
                  href="/admin/manage-seva"
                  className="inline-flex items-center rounded-full border-2 border-indigo-300/90 bg-white px-10 py-5 text-xl font-semibold text-indigo-950 shadow-sm hover:bg-indigo-50/80"
                >
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
