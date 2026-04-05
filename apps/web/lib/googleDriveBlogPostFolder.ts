import { Readable } from "stream";
import { google } from "googleapis";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

function parseServiceAccountJson(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === "object" ? (o as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function isBlogDriveFolderConfigured(): boolean {
  const sa = parseServiceAccountJson();
  const parent = process.env.GOOGLE_DRIVE_BLOG_POSTS_PARENT_FOLDER_ID?.trim();
  return Boolean(sa && parent && typeof sa.client_email === "string" && typeof sa.private_key === "string");
}

function getParentFolderId(): string | null {
  return process.env.GOOGLE_DRIVE_BLOG_POSTS_PARENT_FOLDER_ID?.trim() || null;
}

async function getDrive() {
  const json = parseServiceAccountJson();
  if (!json || typeof json.client_email !== "string" || typeof json.private_key !== "string") {
    throw new Error("Invalid GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: json.client_email,
      private_key: String(json.private_key).replace(/\\n/g, "\n"),
    },
    scopes: [DRIVE_SCOPE],
  });
  return google.drive({ version: "v3", auth });
}

function sanitizeFolderName(title: string, postId: string): string {
  const base = title.replace(/[/\\?*:|"<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const suffix = postId.slice(-12);
  const name = base ? `Blog ${suffix} — ${base}` : `Blog post ${suffix}`;
  return name.slice(0, 120);
}

/** anyone | domain — domain requires GOOGLE_DRIVE_SHARING_DOMAIN */
async function applyLinkVisibility(drive: ReturnType<typeof google.drive>, fileId: string) {
  const mode = (process.env.GOOGLE_DRIVE_LINK_VISIBILITY || "anyone").trim().toLowerCase();
  if (mode === "domain") {
    const domain = process.env.GOOGLE_DRIVE_SHARING_DOMAIN?.trim();
    if (!domain) {
      console.warn("googleDriveBlogPostFolder: GOOGLE_DRIVE_LINK_VISIBILITY=domain but GOOGLE_DRIVE_SHARING_DOMAIN is empty");
      return;
    }
    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: { type: "domain", role: "reader", domain },
    });
    return;
  }
  await drive.permissions.create({
    fileId,
    supportsAllDrives: true,
    requestBody: { type: "anyone", role: "reader" },
  });
}

export async function createBlogPostDriveFolder(postId: string, title: string): Promise<{ folderId: string }> {
  if (!isBlogDriveFolderConfigured()) {
    throw new Error("Google Drive folder feature is not configured on the server.");
  }
  const parentId = getParentFolderId();
  if (!parentId) throw new Error("Missing GOOGLE_DRIVE_BLOG_POSTS_PARENT_FOLDER_ID");

  const drive = await getDrive();
  const name = sanitizeFolderName(title, postId);

  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  const folderId = created.data.id;
  if (!folderId) throw new Error("Drive API did not return folder id");

  await applyLinkVisibility(drive, folderId);

  return { folderId };
}

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

export function maxDriveUploadBytes(): number {
  const mb = process.env.GOOGLE_DRIVE_UPLOAD_MAX_MB?.trim();
  if (mb && /^\d+$/.test(mb)) {
    const n = parseInt(mb, 10);
    if (n > 0 && n <= 500) return n * 1024 * 1024;
  }
  return DEFAULT_MAX_BYTES;
}

function isAllowedUploadMime(mime: string): boolean {
  if (!mime) return false;
  return (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime === "application/pdf"
  );
}

export async function uploadFileToBlogPostFolder(
  folderId: string,
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<{ fileId: string; webViewLink: string }> {
  if (!isBlogDriveFolderConfigured()) {
    throw new Error("Google Drive folder feature is not configured on the server.");
  }
  if (!isAllowedUploadMime(mimeType)) {
    throw new Error("Only image, video, audio, or PDF uploads are allowed.");
  }
  const maxB = maxDriveUploadBytes();
  if (buffer.length > maxB) {
    throw new Error(`File too large. Maximum size is ${Math.round(maxB / (1024 * 1024))} MB for this server.`);
  }

  const drive = await getDrive();
  const safeName = filename.replace(/[/\\?*:|"<>]/g, "_").slice(0, 200) || "upload";

  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: safeName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink",
  });

  const fileId = created.data.id;
  if (!fileId) throw new Error("Drive API did not return file id");

  await applyLinkVisibility(drive, fileId);

  const webViewLink =
    created.data.webViewLink?.trim() ||
    `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

  return { fileId, webViewLink };
}
