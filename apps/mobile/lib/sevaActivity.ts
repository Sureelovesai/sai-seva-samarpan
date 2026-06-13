import type { ActivityFormValues } from "@/components/SevaActivityForm";
import type { AdminSevaActivity, SevaScope } from "@/lib/types";

/** Build the JSON body for POST/PATCH /api/admin/seva-activities from form values. */
export function toActivityPayload(v: ActivityFormValues): Record<string, unknown> {
  const city = v.scope === "NATIONAL" ? "National" : v.city.trim();
  return {
    title: v.title.trim(),
    category: v.category,
    scope: v.scope,
    sevaUsaRegion: v.scope === "REGIONAL" ? v.sevaUsaRegion : null,
    city,
    description: v.description.trim() || null,
    startDate: `${v.startDate}T12:00:00`,
    endDate: `${v.endDate}T12:00:00`,
    startTime: v.startTime,
    endTime: v.endTime,
    durationHours: Number(v.durationHours),
    locationName: v.locationName.trim() || null,
    address: v.address.trim(),
    organizationName: v.organizationName.trim() || null,
    capacity: Math.trunc(Number(v.capacity)),
    coordinatorName: v.coordinatorName.trim(),
    coordinatorEmail: v.coordinatorEmail.trim(),
    coordinatorPhone: v.coordinatorPhone.trim(),
    imageUrl: v.imageUrl || null,
    allowKids: v.allowKids,
    joinSevaEnabled: v.joinSevaEnabled,
    isActive: v.isActive,
    isFeatured: v.isFeatured,
    status: v.status,
    contributionItems: v.contributionItems.map((it) => ({
      ...(it.id ? { id: it.id } : {}),
      name: it.name.trim(),
      maxQuantity: Math.trunc(Number(it.maxQuantity)) || 1,
    })),
  };
}

function dateInput(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/** Convert a loaded admin activity into editable form values. */
export function fromActivity(a: AdminSevaActivity): ActivityFormValues {
  return {
    title: a.title ?? "",
    category: a.category ?? "",
    scope: (a.scope as SevaScope) ?? "CENTER",
    sevaUsaRegion: a.sevaUsaRegion ?? "",
    city: a.city ?? "",
    description: a.description ?? "",
    startDate: dateInput(a.startDate),
    endDate: dateInput(a.endDate),
    startTime: a.startTime ?? "",
    endTime: a.endTime ?? "",
    durationHours: a.durationHours != null ? String(a.durationHours) : "",
    locationName: a.locationName ?? "",
    address: a.address ?? "",
    capacity: a.capacity != null ? String(a.capacity) : "",
    coordinatorName: a.coordinatorName ?? "",
    coordinatorEmail: a.coordinatorEmail ?? "",
    coordinatorPhone: a.coordinatorPhone ?? "",
    organizationName: a.organizationName ?? "",
    imageUrl: a.imageUrl ?? null,
    allowKids: a.allowKids ?? true,
    joinSevaEnabled: a.joinSevaEnabled ?? true,
    isActive: a.isActive ?? true,
    isFeatured: a.isFeatured ?? false,
    status: a.status ?? "PUBLISHED",
    contributionItems: (a.contributionItems ?? []).map((it) => ({
      id: it.id,
      name: it.name,
      maxQuantity: String(it.maxQuantity ?? 1),
    })),
  };
}
