import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";

/**
 * GET /api/admin/blog-posts/[id]
 * Get a single blog post by id (including PENDING_APPROVAL). Admin only.
 * Used so admins can view full content, image, and description before approving.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const post = await prisma.blogPost.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        imageUrl: true,
        section: true,
        authorName: true,
        createdAt: true,
        status: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (e: unknown) {
    console.error("Admin blog post GET error:", e);
    return NextResponse.json(
      { error: "Failed to load post", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
