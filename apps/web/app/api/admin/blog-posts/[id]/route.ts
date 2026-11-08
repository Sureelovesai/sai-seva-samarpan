import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole } from "@/lib/getRole";
import { normalizeStoredDriveMedia } from "@/lib/blogDriveMedia";
import { normalizeArticleCanvasPresentation } from "@/lib/articleCanvasPresentation";

/**
 * GET /api/admin/blog-posts/[id]
 * Fetch a blog post for editing (admin/coordinator only)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (
      !session ||
      !hasRole(
        session,
        "ADMIN",
        "BLOG_ADMIN",
        "SEVA_COORDINATOR",
        "REGIONAL_SEVA_COORDINATOR",
        "NATIONAL_SEVA_COORDINATOR"
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: post.id,
      title: post.title,
      content: post.content,
      articleCanvas: normalizeArticleCanvasPresentation(post.articleCanvas ?? null),
      imageUrl: post.imageUrl,
      driveMediaLinks: normalizeStoredDriveMedia(post.driveMediaLinks),
      section: post.section,
      centerCity: post.centerCity,
      sevaDate: post.sevaDate,
      sevaCategory: post.sevaCategory,
      authorId: post.authorId,
      authorName:
        post.authorName ||
        (post.author
          ? post.author.name ||
            [post.author.firstName, post.author.lastName].filter(Boolean).join(" ") ||
            post.author.email
          : null),
      posterEmail: post.posterEmail,
      posterPhone: post.posterPhone,
      status: post.status,
      createdAt: post.createdAt,
    });
  } catch (e: unknown) {
    console.error("Blog post admin GET error:", e);
    return NextResponse.json(
      { error: "Failed to load post", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/blog-posts/[id]
 * Update a blog post (admin/coordinator can edit any post)
 * - ADMIN, BLOG_ADMIN, and SEVA_COORDINATOR can edit any post
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (
      !session ||
      !hasRole(
        session,
        "ADMIN",
        "BLOG_ADMIN",
        "SEVA_COORDINATOR",
        "REGIONAL_SEVA_COORDINATOR",
        "NATIONAL_SEVA_COORDINATOR"
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const post = await prisma.blogPost.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Authorization: Coordinators can only edit their own posts
    const isAdmin = hasRole(session, "ADMIN", "BLOG_ADMIN");
    const isCoordinator = hasRole(
      session,
      "SEVA_COORDINATOR",
      "REGIONAL_SEVA_COORDINATOR",
      "NATIONAL_SEVA_COORDINATOR"
    );
    
    if (isCoordinator && !isAdmin && post.authorId !== session.sub) {
      return NextResponse.json(
        { error: "You can only edit your own posts" },
        { status: 403 }
      );
    }

    // Update allowed fields
    const updateData: Record<string, unknown> = {};
    if (typeof body.title === "string") {
      updateData.title = body.title.trim();
    }
    if (typeof body.content === "string") {
      updateData.content = body.content.trim();
    }
    if (body.articleCanvas !== undefined) {
      updateData.articleCanvas = body.articleCanvas;
    }
    if (typeof body.imageUrl === "string" || body.imageUrl === null) {
      updateData.imageUrl = body.imageUrl ? body.imageUrl.trim() : null;
    }
    if (Array.isArray(body.driveMediaLinks)) {
      updateData.driveMediaLinks = body.driveMediaLinks;
    }
    if (typeof body.section === "string") {
      updateData.section = body.section.trim();
    }
    if (typeof body.centerCity === "string") {
      updateData.centerCity = body.centerCity.trim();
    }
    if (body.sevaDate !== undefined && body.sevaDate !== null) {
      // Convert date string (YYYY-MM-DD) to ISO-8601 DateTime
      const dateStr = typeof body.sevaDate === 'string' ? body.sevaDate : body.sevaDate?.toString();
      if (dateStr) {
        updateData.sevaDate = new Date(`${dateStr}T00:00:00Z`).toISOString();
      }
    }
    if (typeof body.sevaCategory === "string") {
      updateData.sevaCategory = body.sevaCategory.trim();
    }
    if (typeof body.authorName === "string") {
      updateData.authorName = body.authorName.trim();
    }
    if (typeof body.posterEmail === "string") {
      updateData.posterEmail = body.posterEmail.trim();
    }
    if (typeof body.posterPhone === "string" || body.posterPhone === null) {
      updateData.posterPhone = body.posterPhone ? body.posterPhone.trim() : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.blogPost.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      message: "Post updated successfully",
    });
  } catch (e: unknown) {
    console.error("Blog post admin PATCH error:", e);
    return NextResponse.json(
      { error: "Failed to update post", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/blog-posts/[id]
 * Delete a blog post (admin/coordinator can delete any post)
 * - ADMIN, BLOG_ADMIN, and SEVA_COORDINATOR can delete any post
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (
      !session ||
      !hasRole(
        session,
        "ADMIN",
        "BLOG_ADMIN",
        "SEVA_COORDINATOR",
        "REGIONAL_SEVA_COORDINATOR",
        "NATIONAL_SEVA_COORDINATOR"
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const post = await prisma.blogPost.findUnique({
      where: { id },
      select: { id: true, title: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Authorization: Coordinators can only delete their own posts
    const isAdmin = hasRole(session, "ADMIN", "BLOG_ADMIN");
    const isCoordinator = hasRole(
      session,
      "SEVA_COORDINATOR",
      "REGIONAL_SEVA_COORDINATOR",
      "NATIONAL_SEVA_COORDINATOR"
    );
    
    if (isCoordinator && !isAdmin && post.authorId !== session.sub) {
      return NextResponse.json(
        { error: "You can only delete your own posts" },
        { status: 403 }
      );
    }

    await prisma.blogPost.delete({
      where: { id },
    });

    return NextResponse.json({
      id,
      message: "Post deleted successfully",
    });
  } catch (e: unknown) {
    console.error("Blog post admin DELETE error:", e);
    return NextResponse.json(
      { error: "Failed to delete post", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
