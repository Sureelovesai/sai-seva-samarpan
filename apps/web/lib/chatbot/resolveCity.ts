import { CITIES } from "@/lib/cities";

/** Map user text to a canonical center/city name from the app list, or null. */
export function resolveCityFromText(raw: string): string | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return null;

  for (const c of CITIES) {
    if (c.toLowerCase() === t) return c;
  }
  for (const c of CITIES) {
    const cl = c.toLowerCase();
    if (cl.includes(t) || t.includes(cl)) return c;
  }
  return null;
}
