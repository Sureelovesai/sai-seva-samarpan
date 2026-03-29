import { NextResponse } from "next/server";
import { getSessionWithRole } from "@/lib/getRole";
import { canGenerateBlogReport } from "@/lib/blogReportAccess";
import { findManyBlogReportsForList } from "@/lib/blogAnalyticsReportDb";

export const dynamic = "force-dynamic";

function postCount(ids: unknown): number {
  if (!Array.isArray(ids)) return 0;
  return ids.length;
}

/**
 * GET /api/blog-reports
 * List reports (newest first). ADMIN and BLOG_ADMIN only.
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!canGenerateBlogReport(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reports = await findManyBlogReportsForList();

    return NextResponse.json(
      reports.map((r) => ({
        id: r.id,
        reportTitle: r.reportTitle,
        createdAt: r.createdAt.toISOString(),
        dateFrom: r.dateFrom.toISOString(),
        dateTo: r.dateTo.toISOString(),
        centerFilter: r.centerFilter,
        regionFilter: r.regionFilter,
        sevaCategoryFilter: r.sevaCategoryFilter,
        targetWordCount: r.targetWordCount,
        sourcePostCount: postCount(r.sourcePostIds),
      }))
    );
  } catch (e: unknown) {
    console.error("blog-reports GET list error:", e);
    return NextResponse.json(
      { error: "Failed to list reports", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
