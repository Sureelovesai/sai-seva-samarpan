import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BLOG_UID_COOKIE = "blog_uid";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/**
 * POST /api/blog-posts/[id]/reaction
 * Set or remove reaction. Body: { type: "LIKE" | "DISLIKE" | "EMOJI", emojiCode?: string }
 * Uses cookie blog_uid for guest; can be extended to use userId when logged in.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const type = body?.type as string | undefined;
    const emojiCode =
      type === "EMOJI" && typeof body?.emojiCode === "string"
        ? body.emojiCode
        : null;

    if (typeof type !== "string" || !["LIKE", "DISLIKE", "EMOJI"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Use LIKE, DISLIKE, or EMOJI." },
        { status: 400 }
      );
    }
    if (type === "EMOJI" && !emojiCode) {
      return NextResponse.json(
        { error: "emojiCode required for EMOJI reaction." },
        { status: 400 }
      );
    }

    let userIdentifier =
      req.headers.get("cookie")?.match(/blog_uid=([^;]+)/)?.[1] || null;
    if (!userIdentifier) {
      userIdentifier = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    }

    await prisma.blogPostReaction.upsert({
      where: {
        postId_userIdentifier: { postId, userIdentifier },
      },
      create: {
        postId,
        userIdentifier,
        type: type as "LIKE" | "DISLIKE" | "EMOJI",
        emojiCode: type === "EMOJI" ? emojiCode : null,
      },
      update: {
        type: type as "LIKE" | "DISLIKE" | "EMOJI",
        emojiCode: type === "EMOJI" ? emojiCode : null,
      },
    });

    const reactions = await prisma.blogPostReaction.findMany({
      where: { postId },
    });
    const likeCount = reactions.filter((r: (typeof reactions)[number]) => r.type === "LIKE").length;
    const dislikeCount = reactions.filter((r: (typeof reactions)[number]) => r.type === "DISLIKE").length;
    const emojiCounts = reactions
      .filter((r: (typeof reactions)[number]) => r.type === "EMOJI" && r.emojiCode)
      .reduce((acc: Record<string, number>, r: (typeof reactions)[number]) => {
        acc[r.emojiCode!] = (acc[r.emojiCode!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const res = NextResponse.json({
      likeCount,
      dislikeCount,
      emojiCounts,
      myReaction: { type, emojiCode: type === "EMOJI" ? emojiCode : undefined },
    });

    if (!req.headers.get("cookie")?.includes("blog_uid=")) {
      res.headers.append(
        "Set-Cookie",
        `${BLOG_UID_COOKIE}=${userIdentifier}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
      );
    }

    return res;
  } catch (e: unknown) {
    console.error("Reaction error:", e);
    return NextResponse.json(
      { error: "Failed to set reaction", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
