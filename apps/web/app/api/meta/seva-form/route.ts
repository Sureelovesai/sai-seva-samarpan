import { NextResponse } from "next/server";
import { SEVA_CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";
import { USA_REGION_LABELS } from "@/lib/usaRegions";
import { BLOG_POST_SECTION_IDS } from "@/lib/blogPostWriteValidation";

/**
 * GET /api/meta/seva-form
 * Public, read-only lists used by client forms (e.g. the mobile app's Create Post / Add Seva).
 * Keeps native clients in sync with the canonical web lists so validation never drifts.
 */
export async function GET() {
  return NextResponse.json({
    categories: SEVA_CATEGORIES,
    cities: CITIES,
    regions: USA_REGION_LABELS,
    blogSections: BLOG_POST_SECTION_IDS,
  });
}
