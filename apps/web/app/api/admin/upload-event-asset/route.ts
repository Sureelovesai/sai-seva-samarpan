import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put as putBlob } from "@vercel/blob";
import { canManagePortalEvents, getSessionWithRole } from "@/lib/getRole";

const UPLOAD_DIR = "public/uploads/portal-events";
const MAX_SIZE = 4 * 1024 * 1024; // 4MB

const HERO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const FLYER_TYPES = [...HERO_TYPES, "application/pdf"];

function getUploadDir() {
  const cwd = process.cwd();
  if (path.basename(cwd) === "web") {
    return path.join(cwd, UPLOAD_DIR);
  }
  return path.join(cwd, "apps", "web", UPLOAD_DIR);
}

const PROD_STORAGE_UNAVAILABLE =
  "Upload is not available in this environment. Set BLOB_READ_WRITE_TOKEN on Vercel or use local dev.";

export async function POST(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session || !canManagePortalEvents(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind = String(formData.get("kind") || "").toLowerCase();

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided (field: file)." }, { status: 400 });
    }

    if (kind !== "hero" && kind !== "flyer") {
      return NextResponse.json({ error: "Invalid kind. Use hero or flyer." }, { status: 400 });
    }

    const allowed = kind === "hero" ? HERO_TYPES : FLYER_TYPES;
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            kind === "hero"
              ? "Hero must be JPEG, PNG, WebP, or GIF."
              : "Flyer must be JPEG, PNG, WebP, GIF, or PDF.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 4MB." }, { status: 400 });
    }

    const ext =
      path.extname(file.name) ||
      (file.type === "image/png" ? ".png" : file.type === "application/pdf" ? ".pdf" : ".jpg");
    const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const filename = `${kind}-${base}${ext}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await putBlob(`portal-events/${filename}`, file, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    }

    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);
    const url = `/uploads/portal-events/${filename}`;
    return NextResponse.json({ url });
  } catch (e: unknown) {
    const message = (e as Error)?.message ?? String(e);
    console.error("upload-event-asset:", e);
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
