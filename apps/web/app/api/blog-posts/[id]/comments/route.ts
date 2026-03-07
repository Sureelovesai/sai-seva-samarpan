import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";

const COMMENT_MAX_LENGTH = 500;

/**
 * GET /api/blog-posts/[id]/comments
 * List comments for a post, newest last.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const comments = await prisma.blogPostComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(comments);
  } catch (e: unknown) {
    console.error("Comments GET error:", e);
    return NextResponse.json(
      { error: "Failed to load comments", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blog-posts/[id]/comments
 * Add a comment. Logged-in users only. Body: { content: string, authorName?: string }
 * Content limited to COMMENT_MAX_LENGTH characters.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const session = await getSessionWithRole(cookieHeader);
    if (!session) {
      return NextResponse.json(
        { error: "Please log in to comment." },
        { status: 401 }
      );
    }

    const { id: postId } = await params;
    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    let content =
      typeof body?.content === "string" ? body.content.trim() : "";
    const authorName =
      typeof body?.authorName === "string" ? body.authorName.trim() : null;

    if (!content) {
      return NextResponse.json(
        { error: "Comment content is required." },
        { status: 400 }
      );
    }
    if (content.length > COMMENT_MAX_LENGTH) {
      return NextResponse.json(
        {
          error: `Comment must be at most ${COMMENT_MAX_LENGTH} characters.`,
          maxLength: COMMENT_MAX_LENGTH,
        },
        { status: 400 }
      );
    }

    const comment = await prisma.blogPostComment.create({
      data: {
        postId,
        content: content.slice(0, COMMENT_MAX_LENGTH),
        authorName: authorName || null,
      },
    });

    return NextResponse.json(comment);
  } catch (e: unknown) {
    console.error("Comment POST error:", e);
    return NextResponse.json(
      { error: "Failed to add comment", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
