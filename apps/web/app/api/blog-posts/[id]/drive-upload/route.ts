import { Prisma } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { normalizeStoredDriveMedia } from "@/lib/blogDriveMedia";
import { driveFolderUrlFromId } from "@/lib/blogDriveFolderUrl";
import {
  createBlogPostDriveFolder,
  isBlogDriveFolderConfigured,
  maxDriveUploadBytes,
  uploadFileToBlogPostFolder,
} from "@/lib/googleDriveBlogPostFolder";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import { canUploadToBlogPostDrive } from "@/lib/sevaBlogAccess";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/blog-posts/[id]/drive-upload
 * Multipart field "file". Uploads into this post’s Drive folder (creates folder if configured and missing).
 * Author, or admin / blog admin. Appends a Drive link to driveMediaLinks when under the per-post limit.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    const { id } = await params;

    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!canUploadToBlogPostDrive(session, { authorId: post.authorId })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isBlogDriveFolderConfigured()) {
      return NextResponse.json(
        {
          error: "Drive uploads are not configured.",
          detail: "Set GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON and GOOGLE_DRIVE_BLOG_POSTS_PARENT_FOLDER_ID on the server.",
        },
        { status: 503 }
      );
    }

    let folderId = post.driveFolderId;
    if (!folderId) {
      try {
        const created = await createBlogPostDriveFolder(post.id, post.title);
        folderId = created.folderId;
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { driveFolderId: folderId },
        });
      } catch (e) {
        console.error("drive-upload: create folder failed:", e);
        return NextResponse.json(
          {
            error: "Could not create Google Drive folder for this post.",
            detail: (e as Error)?.message ?? String(e),
          },
          { status: 503 }
        );
      }
    }

    const formData = await req.formData().catch(() => null);
    const file = formData?.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Expected multipart field "file".' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const filename = file.name || "upload";

    let webViewLink: string;
    try {
      const up = await uploadFileToBlogPostFolder(folderId, buf, mimeType, filename);
      webViewLink = up.webViewLink;
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      return NextResponse.json({ error: "Upload failed", detail: msg }, { status: 400 });
    }

    const existing = normalizeStoredDriveMedia(post.driveMediaLinks);
    const maxItems = 12;
    let driveMediaLinks = existing;
    const canAppend =
      existing.length < maxItems && !existing.some((x) => x.url === webViewLink);
    if (canAppend) {
      driveMediaLinks = [...existing, { url: webViewLink, caption: filename }];
      await prisma.blogPost.update({
        where: { id: post.id },
        data: {
          driveMediaLinks: driveMediaLinks as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      fileUrl: webViewLink,
      driveFolderUrl: driveFolderUrlFromId(folderId),
      driveMediaLinks,
      appendedToMediaList: driveMediaLinks.length > existing.length,
      mediaListFull: existing.length >= maxItems,
      maxUploadMb: Math.round(maxDriveUploadBytes() / (1024 * 1024)),
    });
  } catch (e: unknown) {
    console.error("drive-upload error:", e);
    return NextResponse.json(
      { error: "Upload failed", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
