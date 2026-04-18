import type { UsaRegionLabel } from "@/lib/usaRegions";
import { normalizeUsaRegionQuery } from "@/lib/usaRegions";

/**
 * Detect a USA region from free-form chat text (e.g. "seva in region 3", "USA region 7/8").
 */
export function resolveUsaRegionFromUserMessage(text: string): UsaRegionLabel | null {
  const t = text.trim();
  if (!t) return null;

  if (/region\s*7\s*\/\s*8/i.test(t)) {
    return normalizeUsaRegionQuery("Region 7/8");
  }

  const whole = normalizeUsaRegionQuery(t);
  if (whole) return whole;

  const m = /(?:usa\s*)?region\s*(\d+)(?:\s*\/\s*(\d+))?/i.exec(t);
  if (m?.[1] === "7" && m[2] === "8") return "Region 7/8";
  if (m?.[1]) {
    return normalizeUsaRegionQuery(`Region ${m[1]}`);
  }

  return null;
}
