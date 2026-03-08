import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";

/**
 * GET /api/admin/blog-posts/pending
 * List blog posts with status PENDING_APPROVAL. Admin only.
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const posts = await prisma.blogPost.findMany({
      where: { status: "PENDING_APPROVAL" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        section: true,
        authorName: true,
        createdAt: true,
        status: true,
      },
    });

    return NextResponse.json(posts);
  } catch (e: unknown) {
    console.error("Admin pending blog posts error:", e);
    return NextResponse.json(
      { error: "Failed to load pending posts", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
