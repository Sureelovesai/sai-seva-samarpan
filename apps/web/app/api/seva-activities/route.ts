import type { Prisma } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole } from "@/lib/getRole";
import { activityOverlapsDateRange, activitySpansDateKey, dateKeyUTC } from "@/lib/sevaActivityDates";
import { adminSevaActivityListWhere } from "@/lib/sevaCoordinatorActivityAccess";
import {
  prismaCityInUsaRegionOr,
  prismaSevaActivityInUsaRegionListing,
  type UsaRegionLabel,
  usaRegionFromUrlParams,
} from "@/lib/usaRegions";
import { sevaSignupParticipantTotal } from "@/lib/sevaCapacity";

/**
 * Public listings (Find Seva, featured on Home, Join page): hide activities whose last day has passed.
 * Uses endDate if set, otherwise startDate (same-day activities use that day as the last day).
 * Undated activities (no start/end) stay listed. Does not delete data — analytics / dashboards still use historical signups & hours.
 */
function isStillOpenForPublicListing(a: { startDate: Date | null; endDate: Date | null }): boolean {
  const lastDay = a.endDate ?? a.startDate;
  if (!lastDay) return true;
  const lastKey = dateKeyUTC(lastDay);
  const todayKey = dateKeyUTC(new Date());
  return lastKey >= todayKey;
}

const STATUS_VALUES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

const activityPublicSelect = {
  id: true,
  title: true,
  category: true,
  description: true,
  city: true,
  startDate: true,
  endDate: true,
  startTime: true,
  endTime: true,
  durationHours: true,
  locationName: true,
  organizationName: true,
  address: true,
  capacity: true,
  coordinatorName: true,
  coordinatorEmail: true,
  coordinatorPhone: true,
  imageUrl: true,
  isActive: true,
  isFeatured: true,
  status: true,
  scope: true,
  sevaUsaRegion: true,
  createdAt: true,
  updatedAt: true,
  groupId: true,
  group: {
    select: {
      id: true,
      title: true,
      status: true,
    },
  },
} satisfies Prisma.SevaActivitySelect;

type ActivityPublicRow = Prisma.SevaActivityGetPayload<{ select: typeof activityPublicSelect }>;

function toPublicActivityJson(a: ActivityPublicRow, spotsRemaining: number | null) {
  const { group, groupId: _g, ...rest } = a;
  return {
    ...rest,
    /** When `capacity` is set: seats still available (capacity minus APPROVED participants, adults+kids). Otherwise null. */
    spotsRemaining,
    group:
      group && group.status === "PUBLISHED"
        ? { id: group.id, title: group.title }
        : null,
  };
}

/**
 * GET /api/seva-activities
 * Returns seva activities for Find Seva and public listings.
 * Optional query params:
 *   - category, city, q, featured (true)
 *   - usaRegion — Sri Sathya Sai USA region (Region 1 … Region 10, Region 7/8); limits to cities in lib/data/sai-centers-city-usa-region.json. Legacy "Reg N (...)" values still accepted.
 *   - region — shorthand alias for usaRegion (e.g. region=3 → Region 3). Ignored if usaRegion is set.
 *   - date=YYYY-MM-DD — legacy: only activities spanning that calendar day
 *   - fromDate & toDate=YYYY-MM-DD — activities whose schedule overlaps that inclusive range (either alone defaults to a single day)
 *   - activityStatus — only for logged-in ADMIN / seva coordinators (ignored otherwise).
 *   - sevaScope — CENTER | REGIONAL | NATIONAL (Find Seva tabs). When omitted, region filter uses the legacy “mixed” listing (centers + regional + national in that USA region).
 *
 * Without date / fromDate+toDate, past activities (last day before today) are omitted.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const sevaScopeRaw = (searchParams.get("sevaScope") || "").trim().toUpperCase();
    const sevaScope =
      sevaScopeRaw === "CENTER" || sevaScopeRaw === "REGIONAL" || sevaScopeRaw === "NATIONAL"
        ? (sevaScopeRaw as "CENTER" | "REGIONAL" | "NATIONAL")
        : null;

    const category = searchParams.get("category") || "All";
    const city = searchParams.get("city") || "All";
    const usaRegion = usaRegionFromUrlParams((k) => searchParams.get(k));
    const q = (searchParams.get("q") || "").trim();
    const featuredOnly = searchParams.get("featured") === "true";
    const dateDay = (searchParams.get("date") || "").trim();
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateDay);

    const fromRaw = (searchParams.get("fromDate") || "").trim();
    const toRaw = (searchParams.get("toDate") || "").trim();
    const dateKeyRe = /^\d{4}-\d{2}-\d{2}$/;
    const fromOk = dateKeyRe.test(fromRaw);
    const toOk = dateKeyRe.test(toRaw);
    let rangeFrom = fromOk ? fromRaw : "";
    let rangeTo = toOk ? toRaw : "";
    if (fromOk && !toOk) rangeTo = fromRaw;
    if (!fromOk && toOk) rangeFrom = toRaw;
    const rangeOk = dateKeyRe.test(rangeFrom) && dateKeyRe.test(rangeTo);
    if (rangeOk && rangeFrom > rangeTo) {
      const x = rangeFrom;
      rangeFrom = rangeTo;
      rangeTo = x;
    }

    const activityStatusRaw = searchParams.get("activityStatus")?.trim() || "";
    const session = await getSessionWithRole(req.headers.get("cookie"));
    const canStatus =
      session &&
      hasRole(
        session,
        "ADMIN",
        "SEVA_COORDINATOR",
        "REGIONAL_SEVA_COORDINATOR",
        "NATIONAL_SEVA_COORDINATOR"
      );
    const statusFilter =
      canStatus &&
      activityStatusRaw &&
      activityStatusRaw !== "All" &&
      (STATUS_VALUES as readonly string[]).includes(activityStatusRaw)
        ? activityStatusRaw
        : null;

    const base: Record<string, unknown> = {
      listedAsCommunityOutreach: false,
    };
    if (statusFilter === "PUBLISHED") {
      base.isActive = true;
      base.status = "PUBLISHED";
    } else if (statusFilter) {
      base.status = statusFilter;
    } else {
      base.isActive = true;
    }

    if (featuredOnly) base.isFeatured = true;
    if (category !== "All") base.category = category;
    if (city !== "All") base.city = city;
    if (sevaScope) {
      base.scope = sevaScope;
    }

    const andClauses: object[] = [];
    if (usaRegion) {
      if (sevaScope === "REGIONAL") {
        andClauses.push({ sevaUsaRegion: usaRegion });
      } else if (sevaScope === "NATIONAL") {
        /* National listings are not limited by USA region */
      } else if (sevaScope === "CENTER") {
        andClauses.push(prismaCityInUsaRegionOr(usaRegion));
      } else {
        andClauses.push(prismaSevaActivityInUsaRegionListing(usaRegion));
      }
    }
    if (q) {
      andClauses.push({
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
          { city: { contains: q, mode: "insensitive" as const } },
          { locationName: { contains: q, mode: "insensitive" as const } },
          { address: { contains: q, mode: "insensitive" as const } },
        ],
      });
    }
    if (statusFilter && session) {
      const scopeW = adminSevaActivityListWhere(session);
      if (scopeW) andClauses.push(scopeW);
    }

    const where =
      andClauses.length > 0 ? { ...base, AND: andClauses } : base;

    const activities: ActivityPublicRow[] = await prisma.sevaActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: activityPublicSelect,
    });

    let list: ActivityPublicRow[];
    if (rangeOk) {
      list = activities.filter((a: ActivityPublicRow) =>
        activityOverlapsDateRange(a, rangeFrom, rangeTo)
      );
    } else if (dateOk) {
      list = activities.filter((a: ActivityPublicRow) => activitySpansDateKey(a, dateDay));
    } else {
      list = activities.filter(isStillOpenForPublicListing);
    }

    const ids = list.map((a) => a.id);
    const usedByActivity = new Map<string, number>();
    if (ids.length > 0) {
      const approvedRows = await prisma.sevaSignup.findMany({
        where: { activityId: { in: ids }, status: "APPROVED" },
        select: { activityId: true, adultsCount: true, kidsCount: true },
      });
      for (const s of approvedRows) {
        const n = sevaSignupParticipantTotal(s);
        usedByActivity.set(s.activityId, (usedByActivity.get(s.activityId) ?? 0) + n);
      }
    }

    const hasContributionListById = new Set<string>();
    if (ids.length > 0) {
      const grouped = await prisma.sevaContributionItem.groupBy({
        by: ["activityId"],
        where: { activityId: { in: ids } },
        _count: { _all: true },
      });
      for (const g of grouped) {
        hasContributionListById.add(g.activityId);
      }
    }

    const payload = list.map((a) => {
      const cap = a.capacity;
      let spotsRemaining: number | null = null;
      if (cap != null && cap > 0) {
        const used = usedByActivity.get(a.id) ?? 0;
        spotsRemaining = Math.max(0, cap - used);
      }
      return {
        ...toPublicActivityJson(a, spotsRemaining),
        /** True if coordinators configured item / supply list — excluded from batch Join Seva on Seva Details. */
        hasContributionList: hasContributionListById.has(a.id),
      };
    });

    return NextResponse.json(payload);
  } catch (e: unknown) {
    const err = e as Error & { error?: Error; message?: string };
    const detail = err?.error?.message ?? err?.message ?? (typeof e === "object" && e !== null ? String(e) : String(e));
    console.error("Seva GET error:", detail, e);
    return NextResponse.json(
      { error: "Failed to load activities", detail },
      { status: 500 }
    );
  }
}
