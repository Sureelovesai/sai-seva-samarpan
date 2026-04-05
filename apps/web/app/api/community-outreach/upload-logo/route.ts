import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put as putBlob } from "@vercel/blob";
import { getSessionWithRole } from "@/lib/getRole";

const UPLOAD_DIR = "public/uploads/community-outreach-logos";
const MAX_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function getUploadDir() {
  const cwd = process.cwd();
  if (path.basename(cwd) === "web") {
    return path.join(cwd, UPLOAD_DIR);
  }
  return path.join(cwd, "apps", "web", UPLOAD_DIR);
}

const PROD_STORAGE_UNAVAILABLE =
  "Image upload is not available in this environment. Paste an image URL instead, or contact your administrator.";

/**
 * POST /api/community-outreach/upload-logo
 * Logged-in users only. Stores logo for organization profile registration.
 */
export async function POST(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) {
      return NextResponse.json({ error: "Sign in to upload a logo." }, { status: 401 });
    }

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

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await putBlob(`community-outreach-logos/${filename}`, file, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    }

    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/community-outreach-logos/${filename}`;
    return NextResponse.json({ url });
  } catch (e: unknown) {
    const message = (e as Error)?.message ?? String(e);
    console.error("community-outreach upload-logo:", e);
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
