import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put as putBlob } from "@vercel/blob";

const UPLOAD_DIR = "public/uploads/seva-activities";
const MAX_SIZE = 4 * 1024 * 1024; // 4MB (Vercel serverless body limit is 4.5MB)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function getUploadDir() {
  const cwd = process.cwd();
  if (path.basename(cwd) === "web") {
    return path.join(cwd, UPLOAD_DIR);
  }
  return path.join(cwd, "apps", "web", UPLOAD_DIR);
}

const PROD_STORAGE_UNAVAILABLE =
  "Image upload is not available in this environment. You can paste an image URL in the field below instead.";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Use form field 'file'." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4MB." },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name) || (file.type === "image/png" ? ".png" : ".jpg");
    const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const filename = `${base}${ext}`;

    // Production: use Vercel Blob when token is set (e.g. on Vercel with a Blob store)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await putBlob(`seva-activities/${filename}`, file, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    }

    // Local dev: write to filesystem
    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/seva-activities/${filename}`;
    return NextResponse.json({ url });
  } catch (e: unknown) {
    const message = (e as Error)?.message ?? String(e);
    console.error("Upload error:", e);
    const isReadOnly =
      /EACCES|EPERM|read-only|readonly/i.test(message) || process.env.VERCEL === "1";
    return NextResponse.json(
      {
        error: "Upload failed",
        detail: isReadOnly ? PROD_STORAGE_UNAVAILABLE : message,
      },
      { status: 500 }
    );
  }
}
