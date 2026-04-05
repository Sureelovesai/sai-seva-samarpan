import { NextResponse } from "next/server";
import { driveFolderUrlFromId } from "@/lib/blogDriveFolderUrl";
import { createBlogPostDriveFolder, isBlogDriveFolderConfigured } from "@/lib/googleDriveBlogPostFolder";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole } from "@/lib/getRole";

/**
 * POST /api/admin/blog-posts/[id]/drive-folder
 * Create the per-post Google Drive folder if missing (admin / blog admin).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session || !hasRole(session, "ADMIN", "BLOG_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.driveFolderId) {
      return NextResponse.json({
        driveFolderId: post.driveFolderId,
        driveFolderUrl: driveFolderUrlFromId(post.driveFolderId),
        message: "Folder already exists.",
      });
    }

    if (!isBlogDriveFolderConfigured()) {
      return NextResponse.json(
        {
          error: "Drive folders are not configured.",
          detail: "Set GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON and GOOGLE_DRIVE_BLOG_POSTS_PARENT_FOLDER_ID.",
        },
        { status: 503 }
      );
    }

    try {
      const { folderId } = await createBlogPostDriveFolder(post.id, post.title);
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { driveFolderId: folderId },
      });
      return NextResponse.json({
        driveFolderId: folderId,
        driveFolderUrl: driveFolderUrlFromId(folderId),
        message: "Folder created.",
      });
    } catch (e) {
      console.error("admin drive-folder:", e);
      return NextResponse.json(
        { error: "Could not create folder", detail: (e as Error)?.message ?? String(e) },
        { status: 503 }
      );
    }
  } catch (e: unknown) {
    console.error("admin drive-folder route:", e);
    return NextResponse.json(
      { error: "Failed", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
