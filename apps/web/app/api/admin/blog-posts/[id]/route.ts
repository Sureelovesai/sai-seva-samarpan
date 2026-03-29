import { NextResponse } from "next/server";
import { validateBlogPostWriteBody } from "@/lib/blogPostWriteValidation";
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
        centerCity: true,
        sevaDate: true,
        sevaCategory: true,
        posterEmail: true,
        posterPhone: true,
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
 * Admin or Blog Admin.
 *
 * Full update (edit published or pending posts): body must pass the same validation as public POST
 * — title, content, section, centerCity, sevaDate, sevaCategory, authorName, posterEmail;
 * optional posterPhone, imageUrl (null clears image).
 *
 * Image-only update: body `{ imageUrl: string | null }` only (legacy).
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

    const keys = Object.keys(body as object);
    const imageOnly =
      keys.length === 1 &&
      Object.prototype.hasOwnProperty.call(body, "imageUrl");

    if (imageOnly) {
      const imageUrl =
        (body as { imageUrl?: unknown }).imageUrl == null ||
        (body as { imageUrl?: unknown }).imageUrl === ""
          ? null
          : String((body as { imageUrl: unknown }).imageUrl).trim() || null;
      const updated = await prisma.blogPost.update({
        where: { id },
        data: { imageUrl },
      });
      return NextResponse.json(updated);
    }

    const validated = validateBlogPostWriteBody(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const d = validated.data;

    const updated = await prisma.blogPost.update({
      where: { id },
      data: {
        title: d.title,
        content: d.content,
        imageUrl: d.imageUrl,
        section: d.section,
        centerCity: d.centerCity,
        sevaDate: d.sevaDate,
        sevaCategory: d.sevaCategory,
        authorName: d.authorName,
        posterEmail: d.posterEmail,
        posterPhone: d.posterPhone,
      },
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
