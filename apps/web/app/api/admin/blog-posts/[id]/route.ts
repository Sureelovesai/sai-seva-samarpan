import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole } from "@/lib/getRole";

/**
 * GET /api/admin/blog-posts/[id]
 * Get a single blog post by id (including PENDING_APPROVAL). Admin or Blog Admin.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session || !hasRole(session, "ADMIN", "BLOG_ADMIN")) {
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

/**
 * PATCH /api/admin/blog-posts/[id]
 * Update a blog post (e.g. clear image to use default). Admin or Blog Admin.
 * Body: { imageUrl?: string | null } – set to null to use the default placeholder image on the site.
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

    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const updates: { imageUrl?: string | null } = {};
    if (Object.prototype.hasOwnProperty.call(body, "imageUrl")) {
      updates.imageUrl = body.imageUrl == null || body.imageUrl === "" ? null : String(body.imageUrl).trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(post);
    }

    const updated = await prisma.blogPost.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    console.error("Admin blog post PATCH error:", e);
    return NextResponse.json(
      { error: "Failed to update post", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/blog-posts/[id]
 * Delete a blog post. Only ADMIN role (not BLOG_ADMIN) can delete. Works for published or pending posts.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session || !hasRole(session, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden. Only Admin can delete posts." }, { status: 403 });
    }

    const { id } = await params;
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ id, message: "Post deleted." });
  } catch (e: unknown) {
    console.error("Admin blog post DELETE error:", e);
    return NextResponse.json(
      { error: "Failed to delete post", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
