import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
