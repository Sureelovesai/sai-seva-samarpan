/**
 * Blog posts: extra images / videos / audio via shared Google Drive (or Docs) links.
 * Authors paste “anyone with the link can view” URLs; only drive.google.com / docs.google.com are accepted.
 */

export type BlogDriveMediaItem = { url: string; caption?: string };

const MAX_ITEMS = 12;
const MAX_URL_LEN = 600;
const MAX_CAPTION_LEN = 240;

export function isAllowedGoogleMediaUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr.trim());
    if (u.protocol !== "https:") return false;
    const h = u.hostname.replace(/^www\./i, "").toLowerCase();
    return h === "drive.google.com" || h === "docs.google.com";
  } catch {
    return false;
  }
}

export function parseAndValidateDriveMediaLinks(raw: unknown):
  | { ok: true; value: BlogDriveMediaItem[] }
  | { ok: false; error: string } {
  if (raw == null || raw === "") return { ok: true, value: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "driveMediaLinks must be an array of { url, caption? }." };
  }
  if (raw.length > MAX_ITEMS) {
    return { ok: false, error: `You can add at most ${MAX_ITEMS} Drive / Docs links per post.` };
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
    if (!isAllowedGoogleMediaUrl(url)) {
      return {
        ok: false,
        error:
          "Each link must be a Google Drive or Google Docs URL (https://drive.google.com/... or https://docs.google.com/...).",
      };
    }
    if (seen.has(url)) continue;
    seen.add(url);
    const caption =
      typeof o.caption === "string" && o.caption.trim()
        ? o.caption.trim().slice(0, MAX_CAPTION_LEN)
        : undefined;
    out.push({ url, caption });
  }
  return { ok: true, value: out };
}

function extractGoogleDriveFileId(t: string): string | undefined {
  const filePath = /\/file\/d\/([a-zA-Z0-9_-]+)/i.exec(t)?.[1];
  if (filePath) return filePath;
  if (!/drive\.google\.com/i.test(t)) return undefined;
  return /[?&]id=([a-zA-Z0-9_-]+)/i.exec(t)?.[1];
}

/** Single-file Drive links → preview embed; folders and Docs stay as external links. */
export function driveShareUrlToPresentation(
  url: string
): { mode: "iframe"; src: string } | { mode: "external"; href: string } {
  const t = url.trim();
  if (/\/drive\/folders\//i.test(t) || /docs\.google\.com/i.test(t)) {
    return { mode: "external", href: t };
  }
  const fileId = extractGoogleDriveFileId(t);
  if (fileId) {
    return { mode: "iframe", src: `https://drive.google.com/file/d/${fileId}/preview` };
  }
  return { mode: "external", href: t };
}

export function normalizeStoredDriveMedia(raw: unknown): BlogDriveMediaItem[] {
  const p = parseAndValidateDriveMediaLinks(raw);
  return p.ok ? p.value : [];
}
