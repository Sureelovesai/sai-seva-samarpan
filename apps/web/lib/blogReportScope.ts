import type { Prisma } from "@/generated/prisma";
import { SEVA_CATEGORIES } from "@/lib/categories";
import { CENTERS_FOR_FILTER } from "@/lib/cities";
import {
  type UsaRegionLabel,
  isValidUsaRegion,
  prismaCenterCityInUsaRegionOr,
  prismaCityInUsaRegionOr,
} from "@/lib/usaRegions";

export type ReportScopeInput = {
  dateFrom: Date;
  dateTo: Date;
  centerFilter: string | null;
  regionFilter: string | null;
  sevaCategoryFilter: string | null;
};

export function parseReportDateStart(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0, 0));
}

export function parseReportDateEnd(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 23, 59, 59, 999));
}

/**
 * Blog posts: seva date in range when set; otherwise fall back to createdAt in range (legacy posts).
 */
export function buildApprovedBlogWhereForScope(
  scope: ReportScopeInput
): Prisma.BlogPostWhereInput {
  const parts: Prisma.BlogPostWhereInput[] = [
    { status: "APPROVED" },
    {
      OR: [
        {
          AND: [
            { sevaDate: { not: null } },
            {
              sevaDate: {
                gte: scope.dateFrom,
                lte: scope.dateTo,
              },
            },
          ],
        },
        {
          AND: [
            { sevaDate: null },
            {
              createdAt: {
                gte: scope.dateFrom,
                lte: scope.dateTo,
              },
            },
          ],
        },
      ],
    },
  ];

  if (scope.centerFilter) {
    parts.push({
      centerCity: { equals: scope.centerFilter, mode: "insensitive" },
    });
  } else if (scope.regionFilter) {
    parts.push(prismaCenterCityInUsaRegionOr(scope.regionFilter as UsaRegionLabel));
  }

  if (scope.sevaCategoryFilter) {
    parts.push({
      sevaCategory: { equals: scope.sevaCategoryFilter, mode: "insensitive" },
    });
  }

  return { AND: parts };
}

/**
 * Published active seva activities overlapping the scope (by startDate, else createdAt).
 */
export function buildPublishedActivityWhereForScope(
  scope: ReportScopeInput
): Prisma.SevaActivityWhereInput {
  const parts: Prisma.SevaActivityWhereInput[] = [
    { status: "PUBLISHED" },
    { isActive: true },
    {
      OR: [
        {
          AND: [
            { startDate: { not: null } },
            {
              startDate: {
                gte: scope.dateFrom,
                lte: scope.dateTo,
              },
            },
          ],
        },
        {
          AND: [
            { startDate: null },
            {
              createdAt: {
                gte: scope.dateFrom,
                lte: scope.dateTo,
              },
            },
          ],
        },
      ],
    },
  ];

  if (scope.centerFilter) {
    parts.push({ city: { equals: scope.centerFilter, mode: "insensitive" } });
  } else if (scope.regionFilter) {
    parts.push(prismaCityInUsaRegionOr(scope.regionFilter as UsaRegionLabel));
  }

  if (scope.sevaCategoryFilter) {
    parts.push({
      category: { equals: scope.sevaCategoryFilter, mode: "insensitive" },
    });
  }

  return { AND: parts };
}

export type ScopeParseError = { error: string; status: number };

export function parseScopeFromGenerateBody(body: {
  dateFrom?: unknown;
  dateTo?: unknown;
  centerFilter?: unknown;
  regionFilter?: unknown;
  sevaCategoryFilter?: unknown;
}): ReportScopeInput | ScopeParseError {
  const dateFromRaw =
    typeof body.dateFrom === "string" ? body.dateFrom.trim() : "";
  const dateToRaw = typeof body.dateTo === "string" ? body.dateTo.trim() : "";
  const fromStart = parseReportDateStart(dateFromRaw);
  const toEnd = parseReportDateEnd(dateToRaw);
  if (!fromStart || !toEnd) {
    return {
      error: "dateFrom and dateTo are required (YYYY-MM-DD).",
      status: 400,
    };
  }
  if (fromStart.getTime() > toEnd.getTime()) {
    return { error: "dateFrom must be on or before dateTo.", status: 400 };
  }

  const centerRaw =
    typeof body.centerFilter === "string" ? body.centerFilter.trim() : "All";
  const regionRaw =
    typeof body.regionFilter === "string" ? body.regionFilter.trim() : "All";
  const sevaRaw =
    typeof body.sevaCategoryFilter === "string"
      ? body.sevaCategoryFilter.trim()
      : "All";

  if (centerRaw !== "All" && !(CENTERS_FOR_FILTER as readonly string[]).includes(centerRaw)) {
    return { error: "Invalid center filter.", status: 400 };
  }
  if (regionRaw !== "All" && !isValidUsaRegion(regionRaw)) {
    return { error: "Invalid USA region filter.", status: 400 };
  }
  if (
    sevaRaw !== "All" &&
    !(SEVA_CATEGORIES as readonly string[]).includes(sevaRaw)
  ) {
    return { error: "Invalid seva category filter.", status: 400 };
  }

  return {
    dateFrom: fromStart,
    dateTo: toEnd,
    centerFilter: centerRaw === "All" ? null : centerRaw,
    regionFilter: regionRaw === "All" ? null : regionRaw,
    sevaCategoryFilter: sevaRaw === "All" ? null : sevaRaw,
  };
}
