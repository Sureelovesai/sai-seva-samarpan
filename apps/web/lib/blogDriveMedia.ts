/**
 * Blog posts: extra media stored as public URLs on Cloudflare R2 (S3-compatible).
 * Authors upload from the create-post form; server validates hostname against R2_PUBLIC_BASE_URL.
 */

export type BlogDriveMediaItem = { url: string; caption?: string; contentType?: string };

const MAX_ITEMS = 12;
const MAX_URL_LEN = 1200;
const MAX_CAPTION_LEN = 240;

function r2AllowedHostnames(): Set<string> {
  const out = new Set<string>();
  const add = (raw?: string) => {
    if (!raw) return;
    const t = raw.trim();
    if (!t) return;
    try {
      out.add(new URL(t.replace(/\/$/, "")).hostname);
    } catch {
      /* ignore */
    }
  };
  if (typeof process !== "undefined") {
    add(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL);
    add(process.env.R2_PUBLIC_BASE_URL);
  }
  return out;
}

/** Public media URLs (Cloudflare R2) — same host as R2_PUBLIC_BASE_URL / NEXT_PUBLIC_R2_PUBLIC_BASE_URL. */
export function isAllowedR2HostUrl(urlStr: string): boolean {
  const hosts = r2AllowedHostnames();
  if (hosts.size === 0) return false;
  try {
    const u = new URL(urlStr.trim());
    if (u.protocol !== "https:") return false;
    return hosts.has(u.hostname);
  } catch {
    return false;
  }
}

function pushR2ItemFromRow(
  row: Record<string, unknown>,
  out: BlogDriveMediaItem[],
  seen: Set<string>
): void {
  const url = typeof row.url === "string" ? row.url.trim() : "";
  if (!url || !isAllowedR2HostUrl(url)) return;
  if (url.length > MAX_URL_LEN) return;
  if (seen.has(url)) return;
  seen.add(url);
  const caption =
    typeof row.caption === "string" && row.caption.trim()
      ? row.caption.trim().slice(0, MAX_CAPTION_LEN)
      : undefined;
  const contentType =
    typeof row.contentType === "string" && row.contentType.trim() && row.contentType.length <= 200
      ? row.contentType.trim()
      : undefined;
  out.push(
    contentType
      ? { url, caption, contentType }
      : caption
        ? { url, caption }
        : { url }
  );
}

/**
 * Read stored JSON: keep only R2 URLs (ignores legacy Google / other links).
 */
export function normalizeStoredDriveMedia(raw: unknown): BlogDriveMediaItem[] {
  if (raw == null || raw === "") return [];
  if (!Array.isArray(raw)) return [];
  const out: BlogDriveMediaItem[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    pushR2ItemFromRow(row as Record<string, unknown>, out, seen);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export function parseAndValidateDriveMediaLinks(raw: unknown):
  | { ok: true; value: BlogDriveMediaItem[] }
  | { ok: false; error: string } {
  if (raw == null || raw === "") return { ok: true, value: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "driveMediaLinks must be an array of { url, caption? }." };
  }
  if (raw.length > MAX_ITEMS) {
    return { ok: false, error: `You can add at most ${MAX_ITEMS} media items per post.` };
  }
  const out: BlogDriveMediaItem[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    if (!url) continue;
    if (url.length > MAX_URL_LEN) {
      return { ok: false, error: "One of the media links is too long." };
    }
    if (!isAllowedR2HostUrl(url)) {
      return {
        ok: false,
        error: "Each media URL must be from this site’s cloud storage (R2). Upload files in the form or ask an admin to configure R2.",
      };
    }
    if (seen.has(url)) continue;
    seen.add(url);
    const caption =
      typeof o.caption === "string" && o.caption.trim()
        ? o.caption.trim().slice(0, MAX_CAPTION_LEN)
        : undefined;
    const contentType =
      typeof o.contentType === "string" && o.contentType.trim() && o.contentType.length <= 200
        ? o.contentType.trim()
        : undefined;
    out.push(
      contentType
        ? { url, caption, contentType }
        : caption
          ? { url, caption }
          : { url }
    );
  }
  return { ok: true, value: out };
}

export type R2MediaCategory = "image" | "video" | "audio" | "pdf" | "other";

export function inferR2Category(url: string, contentType?: string): R2MediaCategory {
  if (contentType) {
    const t = contentType.toLowerCase().split(";")[0].trim();
    if (t.startsWith("image/")) return "image";
    if (t.startsWith("video/")) return "video";
    if (t.startsWith("audio/")) return "audio";
    if (t === "application/pdf") return "pdf";
  }
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|avif|bmp)($|\?)/i.test(lower)) return "image";
  if (/\.(mp4|webm|mov|m4v)($|\?)/i.test(lower)) return "video";
  if (/\.(mp3|wav|m4a|ogg|aac|flac)($|\?)/i.test(lower)) return "audio";
  if (/\.pdf($|\?)/i.test(lower)) return "pdf";
  return "other";
}

export function isR2Item(item: BlogDriveMediaItem): boolean {
  return isAllowedR2HostUrl(item.url);
}
