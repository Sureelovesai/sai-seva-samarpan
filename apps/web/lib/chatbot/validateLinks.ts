import { resolveCityFromText } from "./resolveCity";

const ALLOWED_PATHNAMES = new Set([
  "/",
  "/find-seva",
  "/find-community-activity",
  "/partner-organizations",
  "/dashboard",
  "/login",
  "/log-hours",
  "/log-hours/certificate",
  "/community-outreach",
  "/community-outreach/profile",
  "/community-outreach/post-activity",
  "/seva-blog",
  "/seva-activities",
  "/admin/seva-dashboard",
  "/admin/add-seva-activity",
  "/admin/manage-seva",
  "/admin/seva-signups",
  "/admin/roles",
  "/admin/community-outreach",
  "/terms-and-policy",
  "/external",
]);

export type HelpLink = { label: string; href: string };

/**
 * Normalize and validate internal links from the model. Drops unknown paths;
 * fixes Find Seva `city` query to a known center name.
 */
export function sanitizeHelpLinks(items: unknown): HelpLink[] {
  if (!Array.isArray(items)) return [];
  const out: HelpLink[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const label = typeof (item as { label?: unknown }).label === "string" ? (item as { label: string }).label.trim() : "";
    const pathRaw = typeof (item as { path?: unknown }).path === "string" ? (item as { path: string }).path.trim() : "";
    if (!label || !pathRaw.startsWith("/")) continue;

    let pathname = pathRaw;
    let search = "";
    const qIdx = pathRaw.indexOf("?");
    if (qIdx >= 0) {
      pathname = pathRaw.slice(0, qIdx);
      search = pathRaw.slice(qIdx);
    }

    if (!ALLOWED_PATHNAMES.has(pathname)) continue;

    if (pathname === "/find-seva" && search) {
      const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
      const cityParam = params.get("city");
      if (cityParam && cityParam !== "All") {
        const resolved = resolveCityFromText(cityParam);
        if (resolved) params.set("city", resolved);
        else params.delete("city");
      }
      const qs = params.toString();
      out.push({ label, href: qs ? `${pathname}?${qs}` : pathname });
      continue;
    }

    out.push({ label, href: pathname + search });
  }
  return out;
}
