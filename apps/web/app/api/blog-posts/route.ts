import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/blog-posts?section=...
 * List blog posts, optionally by section. Returns reaction counts and no per-user reaction (use GET /api/blog-posts/[id] for current user's reaction).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || undefined;

    const posts = await prisma.blogPost.findMany({
      where: section ? { section } : undefined,
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
    const body = await req.json();
    const {
      title,
      content,
      imageUrl,
      section,
      authorName,
    }: {
      title?: string;
      content?: string;
      imageUrl?: string;
      section?: string;
      authorName?: string;
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 }
      );
    }
    if (!section || typeof section !== "string" || !section.trim()) {
      return NextResponse.json(
        { error: "Section is required." },
        { status: 400 }
      );
    }

    if (typeof (prisma as { blogPost?: { create?: unknown } }).blogPost?.create !== "function") {
      console.error("Prisma client missing blogPost. Run from apps/web: npm run prisma:generate");
      return NextResponse.json(
        { error: "Server setup incomplete. Please run: npm run prisma:generate (from apps/web), then restart the dev server." },
        { status: 503 }
      );
    }
    const post = await prisma.blogPost.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl && typeof imageUrl === "string" ? imageUrl : null,
        section: section.trim(),
        authorName:
          authorName && typeof authorName === "string" ? authorName.trim() : null,
      },
    });

    return NextResponse.json({
      id: post.id,
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl,
      section: post.section,
      authorName: post.authorName,
      createdAt: post.createdAt,
    });
  } catch (e: unknown) {
    console.error("Blog post create error:", e);
    return NextResponse.json(
      { error: "Failed to create post", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
