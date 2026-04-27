import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";

const PRESIGN_EXPIRES_SEC = 3600;
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB — adjust in R2 dashboard if needed

function getR2Env() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase: publicBase.replace(/\/$/, "") };
}

export function isR2Configured(): boolean {
  return getR2Env() !== null;
}

export function isAllowedBlogR2Mime(contentType: string): boolean {
  const t = contentType.toLowerCase().split(";")[0].trim();
  if (t.startsWith("image/")) return true;
  if (t.startsWith("video/")) return true;
  if (t.startsWith("audio/")) return true;
  if (t === "application/pdf") return true;
  if (t === "application/msword") return true;
  if (t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return true;
  if (t === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return true;
  if (t === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return true;
  return false;
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 180);
  return base || "upload";
}

function makeObjectKey(originalName: string): string {
  const safe = sanitizeFilename(originalName).replace(/[^a-zA-Z0-9._\- ()]/g, "_");
  const id = randomBytes(8).toString("hex");
  return `blog/${new Date().toISOString().slice(0, 10)}/${id}/${safe}`;
}

let cachedClient: S3Client | null = null;

function getS3Client(env: NonNullable<ReturnType<typeof getR2Env>>): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
  return cachedClient;
}

export type R2PresignResult = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  headers: Record<string, string>;
};

/**
 * Presigned PUT URL for direct browser → R2 upload. Configure CORS on the R2 bucket for your site origin.
 */
export async function createR2PresignedPut(input: {
  fileName: string;
  contentType: string;
  fileSize: number;
}): Promise<{ ok: true; data: R2PresignResult } | { ok: false; error: string; status?: number }> {
  const env = getR2Env();
  if (!env) {
    return {
      ok: false,
      error:
        "Cloud storage (R2) is not configured on the server. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL.",
      status: 503,
    };
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return { ok: false, error: "Invalid file size.", status: 400 };
  }
  if (input.fileSize > MAX_BYTES) {
    return { ok: false, error: `File too large. Maximum is ${Math.floor(MAX_BYTES / (1024 * 1024))} MB.`, status: 400 };
  }

  const ct = input.contentType.trim();
  if (!ct || !isAllowedBlogR2Mime(ct)) {
    return {
      ok: false,
      error:
        "This file type is not allowed. Use images, video, audio, PDF, or common Office documents.",
      status: 400,
    };
  }

  const key = makeObjectKey(input.fileName);
  const client = getS3Client(env);

  const command = new PutObjectCommand({
    Bucket: env.bucket,
    Key: key,
    ContentType: ct,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRES_SEC });
  const publicUrl = `${env.publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`;

  return {
    ok: true,
    data: {
      uploadUrl,
      publicUrl,
      key,
      headers: {
        "Content-Type": ct,
      },
    },
  };
}
