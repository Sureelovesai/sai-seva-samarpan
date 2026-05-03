import { Prisma } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getSessionFromCookie } from "@/lib/auth";
import { normalizeStoredDriveMedia } from "@/lib/blogDriveMedia";
import { validateBlogPostWriteBody } from "@/lib/blogPostWriteValidation";
import {
  buildApprovedBlogWhereForScope,
  parseScopeFromGenerateBody,
  type ReportScopeInput,
  type ScopeParseError,
} from "@/lib/blogReportScope";
import { getSessionWithRole } from "@/lib/getRole";
import { canAccessSevaBlog } from "@/lib/sevaBlogAccess";

function isScopeErr(x: ReportScopeInput | ScopeParseError): x is ScopeParseError {
  return "error" in x && "status" in x;
}

function scopeFromBlogListQuery(searchParams: URLSearchParams): ReportScopeInput | null {
  const dateFrom = searchParams.get("dateFrom")?.trim() ?? "";
  const dateTo = searchParams.get("dateTo")?.trim() ?? "";
  if (!dateFrom || !dateTo) return null;
  const parsed = parseScopeFromGenerateBody({
    dateFrom,
    dateTo,
    centerFilter: searchParams.get("center")?.trim() ?? "All",
    regionFilter: searchParams.get("region")?.trim() ?? "All",
    sevaCategoryFilter: searchParams.get("sevaCategory")?.trim() ?? "All",
  });
  if (isScopeErr(parsed)) return null;
  return parsed;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** One-line hint for admins: shared R2 URL prefix when all attachments live under the same path. */
function blogDriveMediaFolderNote(items: { url: string }[]): string {
  if (items.length === 0) return "";
  try {
    const urls = items.map((i) => new URL(i.url));
    const first = urls[0];
    const segs = first.pathname.split("/").filter(Boolean);
    let folderEnd = -1;
    const postsIdx = segs.indexOf("posts");
    if (postsIdx >= 1 && segs[postsIdx - 1] === "blog" && segs[postsIdx + 1]) {
      folderEnd = postsIdx + 1;
    } else {
      const blogIdx = segs.indexOf("blog");
      if (blogIdx >= 0 && segs[blogIdx + 1]) {
        folderEnd = blogIdx + 1;
      }
    }
    if (folderEnd < 0) return "";
    const prefix = `/${segs.slice(0, folderEnd + 1).join("/")}/`;
    const allSame = urls.every((u) => u.origin === first.origin && u.pathname.startsWith(prefix));
    if (!allSame) return "";
    const folderUrl = `${first.origin}${prefix}`;
    return `<p><strong>Media folder URL (R2, this post):</strong> <a href="${escapeHtml(folderUrl)}">${escapeHtml(folderUrl)}</a></p>`;
  } catch {
    return "";
  }
}

/** Sanitize HTML for safe inclusion in email (strip script, iframe, event handlers). */
function sanitizeHtmlForEmail(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "")
    .trim();
}

export const dynamic = "force-dynamic";

const MAX_SEARCH_LEN = 200;

/**
 * GET /api/blog-posts?section=...&q=...
 * Optional report scope (all must be valid together): dateFrom, dateTo (YYYY-MM-DD), center, region,
 * sevaCategory — narrows to approved posts (seva date in range, else createdAt in range) like blog reports.
 * q: case-insensitive search across title, body (HTML), section, authorName, and linked user fields.
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!canAccessSevaBlog(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || undefined;
    const qRaw = (searchParams.get("q") || "").trim();
    const q = qRaw.length > MAX_SEARCH_LEN ? qRaw.slice(0, MAX_SEARCH_LEN) : qRaw;

    /** Each term must match somewhere (title, body, section, or author). Multi-word = AND of terms. */
    const searchTerms = q
      ? q
          .split(/\s+/)
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12)
          .map((t) => (t.length > 80 ? t.slice(0, 80) : t))
      : [];

    const termMatches = (term: string) => ({
      OR: [
        { title: { contains: term, mode: "insensitive" as const } },
        { content: { contains: term, mode: "insensitive" as const } },
        { section: { contains: term, mode: "insensitive" as const } },
        { authorName: { contains: term, mode: "insensitive" as const } },
        { author: { name: { contains: term, mode: "insensitive" as const } } },
        { author: { firstName: { contains: term, mode: "insensitive" as const } } },
        { author: { lastName: { contains: term, mode: "insensitive" as const } } },
        { author: { email: { contains: term, mode: "insensitive" as const } } },
      ],
    });

    const reportScope = scopeFromBlogListQuery(searchParams);
    const clauses: Prisma.BlogPostWhereInput[] = [
      reportScope ? buildApprovedBlogWhereForScope(reportScope) : { status: "APPROVED" },
    ];
    if (section) {
      clauses.push({ section });
    }
    if (searchTerms.length > 0) {
      clauses.push({ AND: searchTerms.map((term) => termMatches(term)) });
    }

    const posts = await prisma.blogPost.findMany({
      where: { AND: clauses },
      orderBy: { createdAt: "desc" },
      include: {
        reactions: true,
        author: { select: { name: true, firstName: true, lastName: true, email: true } },
      },
    });

    const withCounts = posts.map((p: (typeof posts)[number]) => {
      type Reaction = (typeof p.reactions)[number];
      const likeCount = p.reactions.filter((r: Reaction) => r.type === "LIKE").length;
      const dislikeCount = p.reactions.filter((r: Reaction) => r.type === "DISLIKE").length;
      const emojiCounts = p.reactions
        .filter((r: Reaction) => r.type === "EMOJI" && r.emojiCode)
        .reduce((acc: Record<string, number>, r: Reaction) => {
          acc[r.emojiCode!] = (acc[r.emojiCode!] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      return {
        id: p.id,
        title: p.title,
        content: p.content,
        imageUrl: p.imageUrl,
        section: p.section,
        centerCity: p.centerCity,
        sevaDate: p.sevaDate,
        sevaCategory: p.sevaCategory,
        posterEmail: p.posterEmail,
        posterPhone: p.posterPhone,
        authorName:
          p.authorName ||
          (p.author
            ? p.author.name ||
              [p.author.firstName, p.author.lastName].filter(Boolean).join(" ") ||
              p.author.email
            : null),
        createdAt: p.createdAt,
        likeCount,
        dislikeCount,
        emojiCounts,
        driveMediaLinks: normalizeStoredDriveMedia(p.driveMediaLinks),
      };
    });

    return NextResponse.json(withCounts);
  } catch (e: unknown) {
    console.error("Blog posts GET error:", e);
    return NextResponse.json(
      { error: "Failed to load posts", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blog-posts
 * Create a blog post. Body: { title, content, imageUrl?, section, authorName? }
 * Optional: authorId from session later.
 */
export async function POST(req: Request) {
  try {
    const sessionGate = await getSessionWithRole(req.headers.get("cookie"));
    if (!canAccessSevaBlog(sessionGate)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = validateBlogPostWriteBody(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const {
      title,
      content,
      articleCanvas,
      imageUrl,
      driveMediaLinks,
      section,
      centerCity,
      sevaDate,
      sevaCategory,
      authorName,
      posterEmail,
      posterPhone,
    } = validated.data;

    const cookieHeader = req.headers.get("cookie");
    const session = getSessionFromCookie(cookieHeader);

    if (typeof (prisma as { blogPost?: { create?: unknown } }).blogPost?.create !== "function") {
      console.error("Prisma client missing blogPost. Run from apps/web: npm run prisma:generate");
      return NextResponse.json(
        { error: "Server setup incomplete. Please run: npm run prisma:generate (from apps/web), then restart the dev server." },
        { status: 503 }
      );
    }
    const post = await prisma.blogPost.create({
      data: {
        title,
        content,
        articleCanvas: articleCanvas as unknown as Prisma.InputJsonValue,
        imageUrl,
        driveMediaLinks:
          driveMediaLinks.length > 0
            ? (driveMediaLinks as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        section,
        centerCity,
        sevaDate,
        sevaCategory,
        posterEmail,
        posterPhone,
        authorId: session?.sub ?? null,
        authorName,
        status: "PENDING_APPROVAL",
      },
    });

    // Notify admins and blog admins for verification
    const admins: { email: string }[] = await prisma.roleAssignment.findMany({
      where: { role: { in: ["ADMIN", "BLOG_ADMIN"] } },
      select: { email: true },
    });
    const adminEmails = admins.map((a) => a.email.trim()).filter(Boolean);
    // Build absolute app URL so the email link works from any device. Prefer NEXT_PUBLIC_APP_URL (e.g. https://your-app.vercel.app).
    const rawOrigin =
      (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() ||
      (process.env.VERCEL_URL ? `https://${String(process.env.VERCEL_URL).trim()}` : "");
    const appOrigin =
      rawOrigin && (rawOrigin.startsWith("http://") || rawOrigin.startsWith("https://"))
        ? rawOrigin.replace(/\/+$/, "")
        : "http://localhost:3000";
    const loginThenDashboard = `${appOrigin}/login?next=${encodeURIComponent("/admin/seva-dashboard#pending-blog-posts")}`;
    const safeContent = sanitizeHtmlForEmail(post.content);
    // Use absolute image URL in email (relative paths like /blog-right-swami.jpg don't work in email)
    const imageSrc =
      post.imageUrl && post.imageUrl.trim()
        ? post.imageUrl.startsWith("http")
          ? post.imageUrl.trim()
          : `${appOrigin}${post.imageUrl.startsWith("/") ? "" : "/"}${post.imageUrl.trim()}`
        : "";
    const imageBlock =
      imageSrc
        ? `<p><strong>Image:</strong></p><p><img src="${escapeHtml(imageSrc)}" alt="Post image" style="max-width:100%; height:auto; border:1px solid #ddd; border-radius:8px;" /></p>`
        : "";
    const driveItems = normalizeStoredDriveMedia(post.driveMediaLinks);
    const driveFolderNote = blogDriveMediaFolderNote(driveItems);
    const driveBlock =
      driveItems.length > 0
        ? `${driveFolderNote}<p><strong>Extra media (cloud, ${driveItems.length}):</strong></p><ul>${driveItems
            .map(
              (d) =>
                `<li><a href="${escapeHtml(d.url)}">${escapeHtml(d.url)}</a>${d.caption ? ` — ${escapeHtml(d.caption)}` : ""}</li>`
            )
            .join("")}</ul>`
        : "";

    for (const to of adminEmails) {
      const result = await sendEmail({
        to,
        subject: `[Seva Blog] New post pending verification: ${post.title}`,
        html: `
          <p>A new blog post has been submitted and is waiting for verification.</p>
          <p><strong>Title:</strong> ${escapeHtml(post.title)}</p>
          <p><strong>Section:</strong> ${escapeHtml(post.section)}</p>
          ${post.authorName ? `<p><strong>Author:</strong> ${escapeHtml(post.authorName)}</p>` : ""}
          ${post.centerCity ? `<p><strong>Center:</strong> ${escapeHtml(post.centerCity)}</p>` : ""}
          ${post.sevaDate ? `<p><strong>Seva / story date:</strong> ${escapeHtml(post.sevaDate.toISOString().slice(0, 10))}</p>` : ""}
          ${post.sevaCategory ? `<p><strong>Seva category:</strong> ${escapeHtml(post.sevaCategory)}</p>` : ""}
          ${post.posterEmail ? `<p><strong>Contact email:</strong> ${escapeHtml(post.posterEmail)}</p>` : ""}
          ${post.posterPhone ? `<p><strong>Phone:</strong> ${escapeHtml(post.posterPhone)}</p>` : ""}
          ${imageBlock}
          ${driveBlock}
          <p><strong>Description / Content:</strong></p>
          <div style="margin:12px 0; padding:12px; background:#f5f5f5; border-radius:8px; border:1px solid #e0e0e0; max-height:400px; overflow-y:auto;">${safeContent || escapeHtml("(No content)")}</div>
          <p>Please review above and approve the post in the dashboard so it becomes visible on the blog.</p>
          <p><a href="${loginThenDashboard}" style="display:inline-block; padding:10px 20px; background:#b45309; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">Open Admin Dashboard to Approve</a></p>
          <p>Jai Sai Ram.</p>
        `,
      });
      if (!result.ok) {
        console.error("Blog post: admin notification email failed for", to, result.error ?? result.skipped);
      }
    }

    return NextResponse.json({
      id: post.id,
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl,
      section: post.section,
      centerCity: post.centerCity,
      sevaDate: post.sevaDate,
      sevaCategory: post.sevaCategory,
      posterEmail: post.posterEmail,
      posterPhone: post.posterPhone,
      authorName: post.authorName,
      createdAt: post.createdAt,
      status: post.status,
      driveMediaLinks: normalizeStoredDriveMedia(post.driveMediaLinks),
      message: "Thank you for taking the time to submit the post. It will be reviewed and published shortly. Jai Sairam !!",
    });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    if (code === "P2037") {
      console.error("Blog post create error: P2037 (too many DB connections)", e);
      return NextResponse.json(
        {
          error: "Database is temporarily at its connection limit.",
          detail:
            "Use Neon’s pooled DATABASE_URL (-pooler host), restart the dev server after prisma generate, then retry. If this persists, check the Neon dashboard for open connections.",
        },
        { status: 503 }
      );
    }
    const message = (e as Error)?.message ?? String(e);
    console.error("Blog post create error:", e);
    const hint =
      /status|column|unknown field|does not exist/i.test(message)
        ? " The database may be missing the blog post status column. Run from apps/web: npx prisma migrate deploy (or npx prisma db push)."
        : "";
    return NextResponse.json(
      { error: "Failed to create post", detail: message + hint },
      { status: 500 }
    );
  }
}
