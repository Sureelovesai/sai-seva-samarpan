import type { Prisma } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import { canGenerateBlogReport } from "@/lib/blogReportAccess";
import {
  buildApprovedBlogWhereForScope,
  parseScopeFromGenerateBody,
  type ReportScopeInput,
  type ScopeParseError,
} from "@/lib/blogReportScope";
import { generateBlogAnalyticsNarrative } from "@/lib/openaiBlogReport";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_POST_IDS = 60;

function isScopeErr(x: ReportScopeInput | ScopeParseError): x is ScopeParseError {
  return "error" in x && "status" in x;
}

function uniquePostIdsInOrder(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string" || !x.trim()) continue;
    const id = x.trim();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function buildReportTitleFromPicker(posts: { createdAt: Date }[]): string {
  if (posts.length === 0) return "Seva blog report";
  const times = posts.map((p) => p.createdAt.getTime());
  const minD = new Date(Math.min(...times));
  const maxD = new Date(Math.max(...times));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const n = posts.length;
  return `Seva blog report · ${n} stor${n === 1 ? "y" : "ies"} · ${fmt(minD)} – ${fmt(maxD)}`;
}

function buildReportTitle(scope: ReportScopeInput): string {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  let scopeLabel = "All centers";
  if (scope.centerFilter) scopeLabel = scope.centerFilter;
  else if (scope.regionFilter) scopeLabel = scope.regionFilter;
  let title = `Seva blog report · ${fmt(scope.dateFrom)} – ${fmt(scope.dateTo)} · ${scopeLabel}`;
  if (scope.sevaCategoryFilter) {
    title += ` · ${scope.sevaCategoryFilter}`;
  }
  return title;
}

const postSelect = {
  id: true,
  title: true,
  content: true,
  imageUrl: true,
  centerCity: true,
  createdAt: true,
  section: true,
  sevaDate: true,
  sevaCategory: true,
} satisfies Prisma.BlogPostSelect;

type BlogReportPostRow = Prisma.BlogPostGetPayload<{ select: typeof postSelect }>;

/**
 * POST /api/blog-reports/generate
 * Picker: { postIds, userInstructions?, targetWordCount?, reportScope? }
 *   Optional reportScope (same shape as filter flow) stores filters on the report and sets date range meta.
 * Filter: { dateFrom, dateTo, centerFilter?, regionFilter?, sevaCategoryFilter?, targetWordCount?, userInstructions? }
 */
export async function POST(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!canGenerateBlogReport(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    let targetWordCount = Number(body.targetWordCount);
    if (!Number.isFinite(targetWordCount)) targetWordCount = 500;
    targetWordCount = Math.round(targetWordCount);
    targetWordCount = Math.min(2000, Math.max(200, targetWordCount));

    const userInstructions =
      typeof body.userInstructions === "string" ? body.userInstructions.slice(0, 8000) : "";

    const postIds = uniquePostIdsInOrder(body.postIds);

    let posts: BlogReportPostRow[];

    let dateFromStore: Date;
    let dateToStore: Date;
    let centerFilterStore: string | null;
    let regionFilterStore: string | null;
    let sevaCategoryFilterStore: string | null;
    let reportTitle: string;

    if (postIds.length > 0) {
      if (postIds.length > MAX_POST_IDS) {
        return NextResponse.json(
          { error: `Select at most ${MAX_POST_IDS} stories per report.` },
          { status: 400 }
        );
      }

      const found: BlogReportPostRow[] = await prisma.blogPost.findMany({
        where: { id: { in: postIds }, status: "APPROVED" },
        select: postSelect,
      });

      const byId = new Map<string, BlogReportPostRow>(found.map((p) => [p.id, p]));
      posts = postIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);

      if (posts.length !== postIds.length) {
        return NextResponse.json(
          { error: "One or more stories are missing or not approved." },
          { status: 400 }
        );
      }

      const rs = body.reportScope;
      if (rs && typeof rs === "object" && rs !== null && !Array.isArray(rs)) {
        const scopeParsed = parseScopeFromGenerateBody(
          rs as {
            dateFrom?: unknown;
            dateTo?: unknown;
            centerFilter?: unknown;
            regionFilter?: unknown;
            sevaCategoryFilter?: unknown;
          }
        );
        if (isScopeErr(scopeParsed)) {
          return NextResponse.json(
            { error: scopeParsed.error },
            { status: scopeParsed.status }
          );
        }
        dateFromStore = scopeParsed.dateFrom;
        dateToStore = scopeParsed.dateTo;
        centerFilterStore = scopeParsed.centerFilter;
        regionFilterStore = scopeParsed.regionFilter;
        sevaCategoryFilterStore = scopeParsed.sevaCategoryFilter;
        reportTitle = buildReportTitle(scopeParsed);
      } else {
        const times = posts.map((p) => p.createdAt.getTime());
        dateFromStore = startOfUtcDay(new Date(Math.min(...times)));
        dateToStore = endOfUtcDay(new Date(Math.max(...times)));
        centerFilterStore = null;
        regionFilterStore = null;
        sevaCategoryFilterStore = null;
        reportTitle = buildReportTitleFromPicker(posts);
      }
    } else {
      const scopeParsed = parseScopeFromGenerateBody(body);
      if (isScopeErr(scopeParsed)) {
        return NextResponse.json(
          {
            error:
              scopeParsed.error === "dateFrom and dateTo are required (YYYY-MM-DD)."
                ? "Either select at least one story, or provide dateFrom and dateTo (YYYY-MM-DD)."
                : scopeParsed.error,
          },
          { status: scopeParsed.status }
        );
      }

      posts = await prisma.blogPost.findMany({
        where: buildApprovedBlogWhereForScope(scopeParsed),
        orderBy: { createdAt: "asc" },
        select: postSelect,
      });

      if (posts.length === 0) {
        return NextResponse.json(
          {
            error:
              "No approved posts match these filters. Try widening the date range, choose All centers/regions/categories, or ensure posts have seva dates (or posted dates) in range.",
          },
          { status: 400 }
        );
      }

      dateFromStore = scopeParsed.dateFrom;
      dateToStore = scopeParsed.dateTo;
      centerFilterStore = scopeParsed.centerFilter;
      regionFilterStore = scopeParsed.regionFilter;
      sevaCategoryFilterStore = scopeParsed.sevaCategoryFilter;
      reportTitle = buildReportTitle(scopeParsed);
    }

    let generatedBody: string;
    try {
      generatedBody = await generateBlogAnalyticsNarrative(
        posts.map((p) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          imageUrl: p.imageUrl,
          centerCity: p.centerCity,
          createdAt: p.createdAt,
          section: p.section,
        })),
        targetWordCount,
        userInstructions
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      console.error("blog-reports/generate OpenAI error:", e);
      if (msg.includes("OPENAI_API_KEY")) {
        return NextResponse.json(
          { error: "AI reporting is not configured (missing OPENAI_API_KEY)." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const report = await prisma.blogAnalyticsReport.create({
      data: {
        createdById: session!.sub,
        dateFrom: dateFromStore,
        dateTo: dateToStore,
        centerFilter: centerFilterStore,
        regionFilter: regionFilterStore,
        sevaCategoryFilter: sevaCategoryFilterStore,
        targetWordCount,
        userInstructions: userInstructions.trim() || null,
        generatedBody,
        editedBody: null,
        sourcePostIds: posts.map((p) => p.id),
        reportTitle,
      },
    });

    return NextResponse.json({
      id: report.id,
      reportTitle: report.reportTitle,
    });
  } catch (e: unknown) {
    console.error("blog-reports/generate error:", e);
    return NextResponse.json(
      { error: "Failed to generate report", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
