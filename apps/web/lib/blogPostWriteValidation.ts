import type { BlogDriveMediaItem } from "@/lib/blogDriveMedia";
import type { ArticleCanvasPresentation } from "@/lib/articleCanvasPresentation";
import { normalizeArticleCanvasPresentation } from "@/lib/articleCanvasPresentation";
import { parseAndValidateDriveMediaLinks } from "@/lib/blogDriveMedia";
import { SEVA_CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";

/** Must match Seva blog UI section cards / Create flow. */
export const BLOG_POST_SECTION_IDS = [
  "Seva in Action",
  "Seva Ideas And Resources",
  "SSSE & Sai Youth Corner",
  "Sai Inspires",
] as const;

export const BLOG_POSTER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidBlogSection(section: string): boolean {
  return (BLOG_POST_SECTION_IDS as readonly string[]).includes(section.trim());
}

export function isValidSevaCategory(value: string): boolean {
  return (SEVA_CATEGORIES as readonly string[]).includes(value);
}

/** Parse YYYY-MM-DD into a Date (UTC noon) for stable calendar-day storage. */
export function parseSevaDateOnly(raw: string): Date | null {
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type ValidatedBlogPostWrite = {
  title: string;
  content: string;
  articleCanvas: ArticleCanvasPresentation;
  imageUrl: string | null;
  driveMediaLinks: BlogDriveMediaItem[];
  section: string;
  centerCity: string;
  sevaDate: Date;
  sevaCategory: string;
  authorName: string;
  posterEmail: string;
  posterPhone: string | null;
};

/**
 * Shared validation for public blog POST and admin PATCH (create/update body).
 */
export function validateBlogPostWriteBody(body: unknown):
  | { ok: true; data: ValidatedBlogPostWrite }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }
  const b = body as Record<string, unknown>;
  const title = b.title;
  const content = b.content;
  const imageUrl = b.imageUrl;
  const section = b.section;
  const authorName = b.authorName;
  const centerCityRaw = b.centerCity;
  const sevaDateRaw = b.sevaDate;
  const sevaCategoryRaw = b.sevaCategory;
  const posterEmailRaw = b.posterEmail;
  const posterPhoneRaw = b.posterPhone;

  if (!title || typeof title !== "string" || !title.trim()) {
    return { ok: false, error: "Title is required." };
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    return { ok: false, error: "Content is required." };
  }
  if (!section || typeof section !== "string" || !section.trim()) {
    return { ok: false, error: "Section is required." };
  }
  const sectionTrim = section.trim();
  if (!isValidBlogSection(sectionTrim)) {
    return { ok: false, error: "Invalid section." };
  }

  if (!authorName || typeof authorName !== "string" || !authorName.trim()) {
    return { ok: false, error: "Your name is required." };
  }

  if (!posterEmailRaw || typeof posterEmailRaw !== "string" || !posterEmailRaw.trim()) {
    return { ok: false, error: "Email is required." };
  }
  const posterEmail = posterEmailRaw.trim();
  if (!BLOG_POSTER_EMAIL_RE.test(posterEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const posterPhone =
    typeof posterPhoneRaw === "string" && posterPhoneRaw.trim()
      ? posterPhoneRaw.trim().slice(0, 40)
      : null;

  if (!sevaDateRaw || typeof sevaDateRaw !== "string" || !sevaDateRaw.trim()) {
    return { ok: false, error: "Seva / story date is required." };
  }
  const sevaDate = parseSevaDateOnly(sevaDateRaw);
  if (!sevaDate) {
    return { ok: false, error: "Invalid seva / story date." };
  }

  if (!sevaCategoryRaw || typeof sevaCategoryRaw !== "string" || !sevaCategoryRaw.trim()) {
    return { ok: false, error: "Seva category is required." };
  }
  const sevaCategory = sevaCategoryRaw.trim();
  if (!isValidSevaCategory(sevaCategory)) {
    return { ok: false, error: "Invalid seva category." };
  }

  if (!centerCityRaw || typeof centerCityRaw !== "string" || !centerCityRaw.trim()) {
    return { ok: false, error: "Center / city is required." };
  }
  const cTrim = centerCityRaw.trim();
  if (!(CITIES as readonly string[]).includes(cTrim)) {
    return { ok: false, error: "Invalid center / city." };
  }

  const imageUrlNorm =
    imageUrl && typeof imageUrl === "string" && imageUrl.trim()
      ? imageUrl.trim()
      : null;

  const driveParsed = parseAndValidateDriveMediaLinks(
    (b as Record<string, unknown>).driveMediaLinks
  );
  if (!driveParsed.ok) {
    return { ok: false, error: driveParsed.error };
  }

  const articleCanvas = normalizeArticleCanvasPresentation(
    (b as Record<string, unknown>).articleCanvas
  );

  return {
    ok: true,
    data: {
      title: title.trim(),
      content: content.trim(),
      articleCanvas,
      imageUrl: imageUrlNorm,
      driveMediaLinks: driveParsed.value,
      section: sectionTrim,
      centerCity: cTrim,
      sevaDate,
      sevaCategory,
      authorName: authorName.trim(),
      posterEmail,
      posterPhone,
    },
  };
}
