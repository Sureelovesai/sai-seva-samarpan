import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = "public/uploads/blog";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function getUploadDir() {
  const cwd = process.cwd();
  if (path.basename(cwd) === "web") {
    return path.join(cwd, UPLOAD_DIR);
  }
  return path.join(cwd, "apps", "web", UPLOAD_DIR);
}

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
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const ext =
      path.extname(file.name) ||
      (file.type === "image/png" ? ".png" : ".jpg");
    const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const filename = `${base}${ext}`;
    const uploadDir = getUploadDir();

    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/blog/${filename}`;
    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error("Blog upload error:", e);
    return NextResponse.json(
      { error: "Upload failed", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
