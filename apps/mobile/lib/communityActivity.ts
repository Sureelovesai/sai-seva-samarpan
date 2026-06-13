import type { CommunityActivityFormValues } from "@/components/CommunityActivityForm";
import { emptyCommunityActivityValues } from "@/components/CommunityActivityForm";

/** Build the POST/PATCH payload for /api/community-outreach/activity[/id]. */
export function toCommunityPayload(v: CommunityActivityFormValues, opts: { includeStatus: boolean; isAdmin: boolean }) {
  const payload: Record<string, unknown> = {
    title: v.title.trim(),
    category: v.category,
    city: v.city,
    description: v.description.trim() || null,
    startDate: v.startDate,
    endDate: v.endDate,
    startTime: v.startTime.trim(),
    endTime: v.endTime.trim(),
    durationHours: Number(v.durationHours),
    locationName: v.locationName.trim() || null,
    address: v.address.trim(),
    capacity: Math.max(1, Math.floor(Number(v.capacity) || 0)),
    coordinatorName: v.coordinatorName.trim(),
    coordinatorEmail: v.coordinatorEmail.trim(),
    coordinatorPhone: v.coordinatorPhone.trim(),
    imageUrl: v.imageUrl || null,
    isActive: v.isActive,
    contributionItems: v.contributionItems
      .filter((it) => it.name.trim())
      .map((it) => ({
        id: it.id,
        name: it.name.trim(),
        maxQuantity: Math.max(1, Math.floor(Number(it.maxQuantity) || 1)),
      })),
  };
  if (opts.isAdmin && v.organizationName.trim()) payload.organizationName = v.organizationName.trim();
  if (opts.includeStatus) payload.status = v.status;
  return payload;
}

/** Map an activity detail object (from GET /activities/[id]) into form values. */
export function fromCommunityActivity(a: {
  title?: string | null;
  category?: string | null;
  city?: string | null;
  organizationName?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationHours?: number | null;
  locationName?: string | null;
  address?: string | null;
  capacity?: number | null;
  coordinatorName?: string | null;
  coordinatorEmail?: string | null;
  coordinatorPhone?: string | null;
  imageUrl?: string | null;
  isActive?: boolean | null;
  status?: string | null;
  contributionItems?: { id: string; name: string; maxQuantity: number | null }[] | null;
}): CommunityActivityFormValues {
  const base = emptyCommunityActivityValues();
  return {
    ...base,
    title: a.title ?? "",
    category: a.category ?? "",
    city: a.city ?? "",
    organizationName: a.organizationName ?? "",
    description: a.description ?? "",
    startDate: (a.startDate ?? "").slice(0, 10),
    endDate: (a.endDate ?? "").slice(0, 10),
    startTime: a.startTime ?? "",
    endTime: a.endTime ?? "",
    durationHours: a.durationHours != null ? String(a.durationHours) : "",
    locationName: a.locationName ?? "",
    address: a.address ?? "",
    capacity: a.capacity != null ? String(a.capacity) : "",
    coordinatorName: a.coordinatorName ?? "",
    coordinatorEmail: a.coordinatorEmail ?? "",
    coordinatorPhone: a.coordinatorPhone ?? "",
    imageUrl: a.imageUrl ?? null,
    isActive: a.isActive ?? true,
    status: a.status ?? "PUBLISHED",
    contributionItems: (a.contributionItems ?? []).map((it) => ({
      id: it.id,
      name: it.name,
      maxQuantity: it.maxQuantity != null ? String(it.maxQuantity) : "1",
    })),
  };
}
