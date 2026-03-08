import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";

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
 * Update post (e.g. approve). Only ADMIN can set status to APPROVED.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body?.status;

    if (status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only status APPROVED is allowed for approval." },
        { status: 400 }
      );
    }

    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (post.status === "APPROVED") {
      return NextResponse.json({ message: "Already approved", id: post.id });
    }

    await prisma.blogPost.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    return NextResponse.json({ id, status: "APPROVED", message: "Post approved." });
  } catch (e: unknown) {
    console.error("Blog post PATCH error:", e);
    return NextResponse.json(
      { error: "Failed to update post", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
