import type { Prisma } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findUniqueBlogReportById } from "@/lib/blogAnalyticsReportDb";
import { getSessionWithRole } from "@/lib/getRole";
import { canEditBlogReport, canViewBlogReport } from "@/lib/blogReportAccess";
import { normalizePresentation } from "@/lib/reportPresentation";
import {
  buildPublishedActivityWhereForScope,
  type ReportScopeInput,
} from "@/lib/blogReportScope";

export const dynamic = "force-dynamic";

function sourcePostIdsList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function scopeFromReport(r: {
  dateFrom: Date;
  dateTo: Date;
  centerFilter: string | null;
  regionFilter: string | null;
  sevaCategoryFilter: string | null;
}): ReportScopeInput {
  return {
    dateFrom: r.dateFrom,
    dateTo: r.dateTo,
    centerFilter: r.centerFilter,
    regionFilter: r.regionFilter,
    sevaCategoryFilter: r.sevaCategoryFilter,
  };
}

/**
 * GET /api/blog-reports/[id]
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionWithRole(req.headers.get("cookie"));
    const report = await findUniqueBlogReportById(id);
    if (!report) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canViewBlogReport(session, report))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const canEdit = await canEditBlogReport(session, report);

    const ids = sourcePostIdsList(report.sourcePostIds);
    const sourcePostSelect = {
      id: true,
      title: true,
      section: true,
      authorName: true,
      createdAt: true,
      centerCity: true,
      sevaCategory: true,
      sevaDate: true,
    } satisfies Prisma.BlogPostSelect;
    type SourcePostRow = Prisma.BlogPostGetPayload<{ select: typeof sourcePostSelect }>;
    const rows: SourcePostRow[] = await prisma.blogPost.findMany({
      where: { id: { in: ids } },
      select: sourcePostSelect,
    });
    const byId = new Map<string, SourcePostRow>(rows.map((p) => [p.id, p]));
    const sourcePosts = ids
      .map((pid) => byId.get(pid))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({
        id: p.id,
        title: p.title,
        section: p.section,
        authorName: p.authorName,
        createdAt: p.createdAt.toISOString(),
        centerCity: p.centerCity,
        sevaCategory: p.sevaCategory,
        sevaDate: p.sevaDate ? p.sevaDate.toISOString() : null,
      }));

    const activityScope = scopeFromReport(report);
    const activityListSelect = {
      id: true,
      title: true,
      category: true,
      city: true,
      startDate: true,
      status: true,
    } satisfies Prisma.SevaActivitySelect;
    type ActivityListRow = Prisma.SevaActivityGetPayload<{ select: typeof activityListSelect }>;
    const relatedSevaActivities: ActivityListRow[] = await prisma.sevaActivity.findMany({
      where: buildPublishedActivityWhereForScope(activityScope),
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      take: 100,
      select: activityListSelect,
    });

    return NextResponse.json({
      id: report.id,
      reportTitle: report.reportTitle,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      dateFrom: report.dateFrom.toISOString(),
      dateTo: report.dateTo.toISOString(),
      centerFilter: report.centerFilter,
      regionFilter: report.regionFilter,
      sevaCategoryFilter: report.sevaCategoryFilter,
      targetWordCount: report.targetWordCount,
      userInstructions: report.userInstructions,
      generatedBody: report.generatedBody,
      editedBody: report.editedBody,
      presentation: normalizePresentation(report.presentation),
      sourcePostCount: ids.length,
      sourcePosts,
      relatedSevaActivities: relatedSevaActivities.map((a: ActivityListRow) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        city: a.city,
        startDate: a.startDate ? a.startDate.toISOString() : null,
        status: a.status,
      })),
      canEdit,
    });
  } catch (e: unknown) {
    console.error("blog-reports GET [id] error:", e);
    return NextResponse.json(
      { error: "Failed to load report", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

const MAX_BODY = 500_000;

/**
 * PATCH /api/blog-reports/[id]
 * Body: { editedBody?: string, presentation?: { backgroundId, borderId } }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionWithRole(req.headers.get("cookie"));
    const report = await findUniqueBlogReportById(id);
    if (!report) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canEditBlogReport(session, report))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const editedBody = body?.editedBody;
    const hasEditedBody = typeof editedBody === "string";
    const hasPresentation = body && Object.prototype.hasOwnProperty.call(body, "presentation");

    if (!hasEditedBody && !hasPresentation) {
      return NextResponse.json(
        { error: "Provide editedBody and/or presentation." },
        { status: 400 }
      );
    }
    if (hasEditedBody && editedBody.length > MAX_BODY) {
      return NextResponse.json({ error: "editedBody is too long." }, { status: 400 });
    }

    const data: Prisma.BlogAnalyticsReportUpdateInput = {};
    if (hasEditedBody) data.editedBody = editedBody;
    if (hasPresentation) {
      data.presentation = normalizePresentation(body.presentation) as unknown as Prisma.InputJsonValue;
    }

    const updated = await prisma.blogAnalyticsReport.update({
      where: { id },
      data,
      select: {
        id: true,
        editedBody: true,
        presentation: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      editedBody: updated.editedBody,
      presentation: normalizePresentation(updated.presentation),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (e: unknown) {
    console.error("blog-reports PATCH error:", e);
    return NextResponse.json(
      { error: "Failed to save report", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
