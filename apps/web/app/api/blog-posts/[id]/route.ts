import { NextResponse } from "next/server";
import { driveFolderUrlFromId } from "@/lib/blogDriveFolderUrl";
import { normalizeStoredDriveMedia } from "@/lib/blogDriveMedia";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole } from "@/lib/getRole";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * GET /api/blog-posts/[id]
 * Single post with reaction counts and current user's reaction (via cookie blog_uid or auth).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        reactions: true,
        author: { select: { name: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    // Only approved posts are visible publicly
    if (post.status !== "APPROVED") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    type Reaction = (typeof post.reactions)[number];
    const likeCount = post.reactions.filter((r: Reaction) => r.type === "LIKE").length;
    const dislikeCount = post.reactions.filter((r: Reaction) => r.type === "DISLIKE").length;
    const emojiCounts = post.reactions
      .filter((r: Reaction) => r.type === "EMOJI" && r.emojiCode)
      .reduce((acc: Record<string, number>, r: Reaction) => {
        acc[r.emojiCode!] = (acc[r.emojiCode!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/blog_uid=([^;]+)/);
    const userIdentifier = match ? match[1] : null;
    let myReaction: { type: string; emojiCode?: string } | null = null;
    if (userIdentifier) {
      const r = post.reactions.find((x: Reaction) => x.userIdentifier === userIdentifier);
      if (r) myReaction = { type: r.type, emojiCode: r.emojiCode ?? undefined };
    }

    return NextResponse.json({
      id: post.id,
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl,
      driveFolderUrl: driveFolderUrlFromId(post.driveFolderId),
      driveMediaLinks: normalizeStoredDriveMedia(post.driveMediaLinks),
      section: post.section,
      authorName:
        post.authorName ||
        (post.author
          ? post.author.name ||
            [post.author.firstName, post.author.lastName].filter(Boolean).join(" ") ||
            post.author.email
          : null),
      createdAt: post.createdAt,
      likeCount,
      dislikeCount,
      emojiCounts,
      myReaction,
    });
  } catch (e: unknown) {
    console.error("Blog post GET error:", e);
    return NextResponse.json(
      { error: "Failed to load post", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/blog-posts/[id]
 * Moderation: status APPROVED or REJECTED (pending posts only). ADMIN and BLOG_ADMIN.
 * Reject: optional reviewerNote (emailed to poster when posterEmail or author email exists).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session || !hasRole(session, "ADMIN", "BLOG_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body?.status;

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json(
        { error: 'Body must include status: "APPROVED" or "REJECTED".' },
        { status: 400 }
      );
    }

    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: { author: { select: { email: true } } },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (status === "APPROVED") {
      if (post.status === "APPROVED") {
        return NextResponse.json({ message: "Already approved", id: post.id });
      }
      if (post.status !== "PENDING_APPROVAL") {
        return NextResponse.json(
          { error: "Only pending posts can be approved." },
          { status: 400 }
        );
      }
      await prisma.blogPost.update({
        where: { id },
        data: { status: "APPROVED" },
      });
      return NextResponse.json({ id, status: "APPROVED", message: "Post approved." });
    }

    // REJECTED
    if (post.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Only pending posts can be rejected." },
        { status: 400 }
      );
    }
    const reviewerNote =
      typeof body?.reviewerNote === "string" ? body.reviewerNote.trim().slice(0, 500) : "";

    await prisma.blogPost.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    const to =
      (post.posterEmail && post.posterEmail.trim()) ||
      (post.author?.email && post.author.email.trim()) ||
      "";
    if (to) {
      const noteBlock = reviewerNote
        ? `<p><strong>Note from reviewer:</strong></p><p style="padding:12px;background:#f5f5f5;border-radius:8px;">${escapeHtml(reviewerNote)}</p>`
        : "";
      const result = await sendEmail({
        to,
        subject: `[Seva Blog] Post not approved: ${post.title}`,
        html: `
          <p>Your blog post submission was not approved and will not appear on the Seva Blog.</p>
          <p><strong>Title:</strong> ${escapeHtml(post.title)}</p>
          ${noteBlock}
          <p>You are welcome to revise and submit a new post when ready.</p>
          <p>Jai Sai Ram.</p>
        `,
      });
      if (!result.ok) {
        console.error("Blog post reject: email failed for", to, result.error ?? result.skipped);
      }
    }

    return NextResponse.json({ id, status: "REJECTED", message: "Post rejected." });
  } catch (e: unknown) {
    console.error("Blog post PATCH error:", e);
    return NextResponse.json(
      { error: "Failed to update post", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
