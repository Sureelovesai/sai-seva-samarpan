import { prisma } from "@/lib/prisma";
import { promotePendingSignupsForActivity } from "@/lib/sevaSignupPromotion";
import type { BulkGridError, SevaActivityExcelPayload } from "@/lib/sevaBulkImport";

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Required-field validation for Add Seva Activity row 2 (create or update). */
export function collectSevaActivityExcelFieldErrors(
  payload: SevaActivityExcelPayload
): BulkGridError[] {
  const errs: BulkGridError[] = [];
  const req = (label: string, ok: boolean, msg: string) => {
    if (!ok) errs.push({ row: 2, column: label, message: msg });
  };

  const city = payload.city.trim();
  req("Seva Activity", !!payload.title.trim(), "Title is required.");
  req("Find Service (Service Category)", !!payload.category.trim(), "Category is required.");
  req("City", !!city, "City is required.");
  req("Start Date", !!payload.startDate, "Start date is required (YYYY-MM-DD).");
  req("End Date", !!payload.endDate, "End date is required (YYYY-MM-DD).");
  req("Start Time", !!payload.startTime.trim(), "Start time is required.");
  req("End Time", !!payload.endTime.trim(), "End time is required.");
  req(
    "Duration (hours)",
    Number.isFinite(payload.durationHours) && payload.durationHours > 0,
    "Duration (hours) must be greater than 0."
  );
  req("Address", !!payload.address.trim(), "Address is required.");
  req("Coordinator name", !!payload.coordinatorName.trim(), "Coordinator name is required.");
  req("Coordinator Email", !!payload.coordinatorEmail.trim(), "Coordinator email is required.");
  req(
    "Coordinator Phone Number",
    !!payload.coordinatorPhone.trim(),
    "Coordinator phone is required."
  );
  const cap = toIntOrNull(payload.capacity);
  req(
    "Capacity",
    cap !== null && Number.isInteger(cap) && cap >= 1,
    "Capacity must be a whole number of at least 1."
  );

  if (errs.length) return errs;

  try {
    const startD = new Date(payload.startDate);
    const endD = new Date(payload.endDate);
    if (Number.isNaN(startD.getTime()) || Number.isNaN(endD.getTime())) {
      return [{ row: 2, column: "Start Date", message: "Invalid start or end date." }];
    }
  } catch {
    return [{ row: 2, column: "Start Date", message: "Invalid start or end date." }];
  }

  return [];
}

function coordinatorCityErrors(
  payload: SevaActivityExcelPayload,
  opts: { role: string; coordinatorCities?: string[] }
): BulkGridError[] {
  const city = payload.city.trim();
  if (opts.role === "SEVA_COORDINATOR" && opts.coordinatorCities?.length) {
    const allowed = opts.coordinatorCities.some(
      (c) => c.trim().toLowerCase() === city.toLowerCase()
    );
    if (!allowed) {
      return [
        {
          row: 2,
          column: "City",
          message: "You can only set city to one of your registered location(s).",
        },
      ];
    }
  }
  return [];
}

/**
 * Create a new **published** activity from Add Seva Activity row 2 (bulk workbook path).
 * Ignores any Activity ID in the sheet; a new id is assigned.
 */
export async function createSevaActivityFromExcel(
  payload: SevaActivityExcelPayload,
  opts: { role: string; coordinatorCities?: string[] }
): Promise<{ ok: false; errors: BulkGridError[] } | { ok: true; activityId: string }> {
  const coordErrs = coordinatorCityErrors(payload, opts);
  if (coordErrs.length) return { ok: false, errors: coordErrs };

  const fieldErrs = collectSevaActivityExcelFieldErrors(payload);
  if (fieldErrs.length) return { ok: false, errors: fieldErrs };

  const cap = toIntOrNull(payload.capacity)!;
  const startD = new Date(payload.startDate);
  const endD = new Date(payload.endDate);
  const city = payload.city.trim();

  try {
    const created = await prisma.sevaActivity.create({
      data: {
        title: payload.title.trim(),
        category: payload.category.trim(),
        description: payload.description?.trim() || null,
        startDate: startD,
        endDate: endD,
        startTime: payload.startTime.trim(),
        endTime: payload.endTime.trim(),
        durationHours: payload.durationHours,
        city,
        locationName: payload.locationName?.trim() || null,
        address: payload.address.trim(),
        capacity: cap,
        coordinatorName: payload.coordinatorName.trim(),
        coordinatorEmail: payload.coordinatorEmail.trim(),
        coordinatorPhone: payload.coordinatorPhone.trim(),
        isActive: payload.isActive,
        isFeatured: payload.isFeatured,
        status: "PUBLISHED",
        imageUrl: null,
      },
    });
    return { ok: true, activityId: created.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      errors: [{ row: 2, column: "—", message: msg || "Could not create activity." }],
    };
  }
}

/**
 * Update the activity from Add Seva Activity sheet row 2 (same required fields as POST create).
 * Preserves status, imageUrl, organizationName, listedAsCommunityOutreach.
 */
export async function applySevaActivityFromExcel(
  activityId: string,
  payload: SevaActivityExcelPayload | null,
  opts: { role: string; coordinatorCities?: string[] }
): Promise<{ ok: false; errors: BulkGridError[] } | { ok: true; updated: boolean }> {
  if (!payload) return { ok: true, updated: false };

  if (payload.sheetActivityId && payload.sheetActivityId !== activityId) {
    return {
      ok: false,
      errors: [
        {
          row: 2,
          column: "Activity ID",
          message: `Activity ID in the sheet does not match this upload (${activityId.slice(0, 8)}…).`,
        },
      ],
    };
  }

  const existing = await prisma.sevaActivity.findUnique({ where: { id: activityId } });
  if (!existing) {
    return {
      ok: false,
      errors: [{ row: 2, column: "—", message: "Activity not found." }],
    };
  }

  const coordErrs = coordinatorCityErrors(payload, opts);
  if (coordErrs.length) return { ok: false, errors: coordErrs };

  const fieldErrs = collectSevaActivityExcelFieldErrors(payload);
  if (fieldErrs.length) return { ok: false, errors: fieldErrs };

  const cap = toIntOrNull(payload.capacity)!;

  let startD: Date;
  let endD: Date;
  try {
    startD = new Date(payload.startDate);
    endD = new Date(payload.endDate);
    if (Number.isNaN(startD.getTime()) || Number.isNaN(endD.getTime())) {
      return {
        ok: false,
        errors: [{ row: 2, column: "Start Date", message: "Invalid start or end date." }],
      };
    }
  } catch {
    return {
      ok: false,
      errors: [{ row: 2, column: "Start Date", message: "Invalid start or end date." }],
    };
  }

  const city = payload.city.trim();
  const isArchived = existing.status === "ARCHIVED";
  const capacityNum = cap;

  await prisma.sevaActivity.update({
    where: { id: activityId },
    data: {
      title: payload.title.trim(),
      category: payload.category.trim(),
      description: payload.description?.trim() || null,
      startDate: startD,
      endDate: endD,
      startTime: payload.startTime.trim(),
      endTime: payload.endTime.trim(),
      durationHours: payload.durationHours,
      city,
      locationName: payload.locationName?.trim() || null,
      address: payload.address.trim(),
      capacity: capacityNum,
      coordinatorName: payload.coordinatorName.trim(),
      coordinatorEmail: payload.coordinatorEmail.trim(),
      coordinatorPhone: payload.coordinatorPhone.trim(),
      isActive: isArchived ? false : payload.isActive,
      isFeatured: payload.isFeatured,
    },
  });

  const oldCapacity = existing.capacity;
  const capacityIncreased =
    capacityNum > 0 &&
    (oldCapacity == null || oldCapacity <= 0 || capacityNum > oldCapacity);
  if (capacityIncreased) {
    try {
      await promotePendingSignupsForActivity(activityId);
    } catch (promoErr) {
      console.error("Excel activity update: promote pending failed", promoErr);
    }
  }

  return { ok: true, updated: true };
}
