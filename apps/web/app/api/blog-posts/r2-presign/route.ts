import { NextResponse } from "next/server";
import { createR2PresignedPut } from "@/lib/r2BlogUpload";

/**
 * POST /api/blog-posts/r2-presign
 * Body: { fileName, contentType, fileSize, blogPostId?, mediaBatchId? }
 * Returns presigned PUT URL for direct upload to Cloudflare R2 (S3-compatible).
 * Browser must PUT the raw file bytes to uploadUrl with the given Content-Type header.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const fileName = typeof (body as { fileName?: unknown }).fileName === "string" ? (body as { fileName: string }).fileName : "";
    const contentType =
      typeof (body as { contentType?: unknown }).contentType === "string"
        ? (body as { contentType: string }).contentType
        : "";
    const fileSize = Number((body as { fileSize?: unknown }).fileSize);
    const blogPostIdRaw = (body as { blogPostId?: unknown }).blogPostId;
    const blogPostId =
      typeof blogPostIdRaw === "string" && blogPostIdRaw.trim() ? blogPostIdRaw.trim() : undefined;
    const mediaBatchIdRaw = (body as { mediaBatchId?: unknown }).mediaBatchId;
    const mediaBatchId =
      typeof mediaBatchIdRaw === "string" && mediaBatchIdRaw.trim()
        ? mediaBatchIdRaw.trim()
        : undefined;

    if (!fileName.trim()) {
      return NextResponse.json({ error: "fileName is required." }, { status: 400 });
    }

    const result = await createR2PresignedPut({
      fileName: fileName.trim(),
      contentType: contentType || "application/octet-stream",
      fileSize,
      blogPostId,
      mediaBatchId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json({
      uploadUrl: result.data.uploadUrl,
      publicUrl: result.data.publicUrl,
      method: "PUT" as const,
      headers: result.data.headers,
      expiresIn: 3600,
    });
  } catch (e: unknown) {
    console.error("R2 presign error:", e);
    return NextResponse.json(
      { error: "Failed to create upload URL.", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
