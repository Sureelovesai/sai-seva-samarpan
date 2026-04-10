import { prisma } from "@/lib/prisma";

/** Prisma P2022 = column not found (DB behind schema / migration not applied). */
export function isPrismaSchemaMismatchError(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  if (err?.code === "P2022") return true;
  const msg = String(err?.message ?? e).toLowerCase();
  return (
    msg.includes("does not exist in the current database") ||
    msg.includes("unknown column") ||
    msg.includes("no such column")
  );
}

const reportListSelectBase = {
  id: true,
  reportTitle: true,
  createdAt: true,
  dateFrom: true,
  dateTo: true,
  centerFilter: true,
  regionFilter: true,
  targetWordCount: true,
  sourcePostIds: true,
} as const;

const reportListSelectFull = {
  ...reportListSelectBase,
  sevaCategoryFilter: true,
} as const;

export type BlogReportListRow = {
  id: string;
  reportTitle: string | null;
  createdAt: Date;
  dateFrom: Date;
  dateTo: Date;
  centerFilter: string | null;
  regionFilter: string | null;
  sevaCategoryFilter: string | null;
  targetWordCount: number;
  sourcePostIds: unknown;
};

type BlogReportListRowBase = Omit<BlogReportListRow, "sevaCategoryFilter">;

export async function findManyBlogReportsForList(): Promise<BlogReportListRow[]> {
  try {
    return (await prisma.blogAnalyticsReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: reportListSelectFull,
    })) as BlogReportListRow[];
  } catch (e) {
    if (!isPrismaSchemaMismatchError(e)) throw e;
    const rows: BlogReportListRowBase[] = await prisma.blogAnalyticsReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: reportListSelectBase,
    });
    return rows.map((r: BlogReportListRowBase) => ({ ...r, sevaCategoryFilter: null }));
  }
}

/** All scalar fields needed by report GET/PATCH and access helpers. */
const reportDetailSelectFull = {
  id: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  dateFrom: true,
  dateTo: true,
  centerFilter: true,
  regionFilter: true,
  sevaCategoryFilter: true,
  targetWordCount: true,
  userInstructions: true,
  generatedBody: true,
  editedBody: true,
  presentation: true,
  sourcePostIds: true,
  reportTitle: true,
} as const;

/** DB without `presentation` column (older migrations). */
const reportDetailSelectNoPresentation = {
  id: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  dateFrom: true,
  dateTo: true,
  centerFilter: true,
  regionFilter: true,
  sevaCategoryFilter: true,
  targetWordCount: true,
  userInstructions: true,
  generatedBody: true,
  editedBody: true,
  sourcePostIds: true,
  reportTitle: true,
} as const;

const reportDetailSelectLegacy = {
  id: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  dateFrom: true,
  dateTo: true,
  centerFilter: true,
  regionFilter: true,
  targetWordCount: true,
  userInstructions: true,
  generatedBody: true,
  editedBody: true,
  sourcePostIds: true,
  reportTitle: true,
} as const;

export type BlogReportDetailRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  dateFrom: Date;
  dateTo: Date;
  centerFilter: string | null;
  regionFilter: string | null;
  sevaCategoryFilter: string | null;
  targetWordCount: number;
  userInstructions: string | null;
  generatedBody: string;
  editedBody: string | null;
  presentation: unknown | null;
  sourcePostIds: unknown;
  reportTitle: string | null;
};

type BlogReportDetailRowBase = Omit<BlogReportDetailRow, "sevaCategoryFilter">;

export async function findUniqueBlogReportById(
  id: string
): Promise<BlogReportDetailRow | null> {
  try {
    const r = await prisma.blogAnalyticsReport.findUnique({
      where: { id },
      select: reportDetailSelectFull,
    });
    return r as BlogReportDetailRow | null;
  } catch (e) {
    if (!isPrismaSchemaMismatchError(e)) throw e;
    try {
      const r = await prisma.blogAnalyticsReport.findUnique({
        where: { id },
        select: reportDetailSelectNoPresentation,
      });
      if (!r) return null;
      return { ...r, presentation: null } as BlogReportDetailRow;
    } catch (e2) {
      if (!isPrismaSchemaMismatchError(e2)) throw e2;
      const r: BlogReportDetailRowBase | null = await prisma.blogAnalyticsReport.findUnique({
        where: { id },
        select: reportDetailSelectLegacy,
      });
      if (!r) return null;
      return { ...r, sevaCategoryFilter: null, presentation: null };
    }
  }
}
