/**
 * Aligns Find Seva filters with Seva Details (`/seva-activities`) tab list and `/api/seva-activities` query params.
 */

export type FindSevaBrowseContext = {
  levelTab: "center" | "regional" | "national";
  center: string;
  usaRegion: string;
  fromDate: string;
  toDate: string;
  category: string;
};

function appendDateRange(p: URLSearchParams, fromDate: string, toDate: string) {
  const dk = /^\d{4}-\d{2}-\d{2}$/;
  const fOk = fromDate && dk.test(fromDate);
  const tOk = toDate && dk.test(toDate);
  if (fOk && tOk) {
    p.set("fromDate", fromDate);
    p.set("toDate", toDate);
  } else if (fOk && !toDate) {
    p.set("fromDate", fromDate);
    p.set("toDate", fromDate);
  } else if (tOk && !fromDate) {
    p.set("fromDate", toDate);
    p.set("toDate", toDate);
  }
}

/** Same filters Find Seva uses for GET /api/seva-activities (sevaScope, city, usaRegion, category, dates). */
export function appendFindSevaBrowseToApiParams(p: URLSearchParams, ctx: FindSevaBrowseContext) {
  if (ctx.category && ctx.category !== "All") {
    p.set("category", ctx.category);
  }
  if (ctx.levelTab === "center") {
    p.set("sevaScope", "CENTER");
    if (ctx.center && ctx.center !== "All") {
      p.set("city", ctx.center);
    }
    if (ctx.usaRegion && ctx.usaRegion !== "All") {
      p.set("usaRegion", ctx.usaRegion);
    }
  } else if (ctx.levelTab === "regional") {
    p.set("sevaScope", "REGIONAL");
    if (ctx.usaRegion && ctx.usaRegion !== "All") {
      p.set("usaRegion", ctx.usaRegion);
    }
  } else {
    p.set("sevaScope", "NATIONAL");
  }
  appendDateRange(p, ctx.fromDate, ctx.toDate);
}

/** Parse `ids` query param (comma-separated activity ids) from Seva Details / Find Seva links. */
export function parseSevaActivityIdsParam(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && /^[a-z0-9]+$/i.test(s));
}

/** Minimal fields for multi-tab / batch compatibility (Find Seva + Seva Details). */
export type SevaActivityMultiTabPick = {
  id: string;
  hasContributionList?: boolean;
};

/**
 * Opening multiple activities together (tabs / batch join) is only valid when every activity
 * has no coordinator “items to bring” (supply) list. Do not mix those with activities that have one.
 */
export function isCompatibleMultiTabSelection(
  ids: string[],
  byId: Map<string, SevaActivityMultiTabPick>
): boolean {
  if (ids.length <= 1) return true;
  const acts = ids.map((id) => byId.get(id)).filter(Boolean) as SevaActivityMultiTabPick[];
  if (acts.length !== ids.length) return true;
  return acts.every((a) => !a.hasContributionList);
}

/**
 * When the URL lists multiple `ids`, drop invalid combinations: if any listed activity has a supply list,
 * only the first id in URL order is kept (items-to-bring flows are one activity at a time).
 */
export function filterIdsForCompatibleMultiTab(
  orderedIds: string[],
  activities: SevaActivityMultiTabPick[]
): string[] {
  const byId = new Map(activities.map((a) => [a.id, a]));
  const resolved = orderedIds.map((id) => byId.get(id)).filter(Boolean) as SevaActivityMultiTabPick[];
  if (resolved.length <= 1) {
    return resolved.map((a) => a.id);
  }
  if (resolved.some((a) => a.hasContributionList)) {
    return resolved[0] ? [resolved[0].id] : [];
  }
  return resolved.map((a) => a.id);
}

export type BuildSevaActivitiesUrlOptions = {
  /** Additional activity ids to open as tabs (order preserved). Usually merged with `activityId`. */
  selectedIds?: string[];
};

function sevaActivitiesSearchParamsFromFindSeva(
  activityId: string,
  ctx: FindSevaBrowseContext,
  options?: BuildSevaActivitiesUrlOptions
) {
  const p = new URLSearchParams();
  p.set("id", activityId);
  p.set("level", ctx.levelTab);
  appendFindSevaBrowseToApiParams(p, ctx);
  const merged = [...new Set([activityId, ...(options?.selectedIds ?? [])].filter(Boolean))];
  if (merged.length > 1) {
    p.set("ids", merged.join(","));
  }
  return p;
}

/**
 * Full URL for “View Details” from Find Seva — preserves level + filters in the query string.
 * When `selectedIds` has 2+ unique ids (including `activityId`), adds `ids=a,b,c` so Seva Details opens those tabs together.
 */
export function buildSevaActivitiesPageUrlFromFindSeva(
  activityId: string,
  ctx: FindSevaBrowseContext,
  options?: BuildSevaActivitiesUrlOptions
): string {
  return `/seva-activities?${sevaActivitiesSearchParamsFromFindSeva(activityId, ctx, options).toString()}`;
}

/** Seva Details under the Mahotsavam landing: same query as Find Seva, but no main site header/footer. */
export const SEVA_MAHOTSAVAM_ACTIVITIES_PATH = "/seva-mahotsavam/activities";

export function buildSevaMahotsavamActivitiesPageUrlFromFindSeva(
  activityId: string,
  ctx: FindSevaBrowseContext,
  options?: BuildSevaActivitiesUrlOptions
): string {
  return `${SEVA_MAHOTSAVAM_ACTIVITIES_PATH}?${sevaActivitiesSearchParamsFromFindSeva(
    activityId,
    ctx,
    options
  ).toString()}`;
}

type SearchGet = { get: (key: string) => string | null };

/**
 * Reads `/seva-activities` URL search params and returns API query params for GET /api/seva-activities.
 * Returns `null` when no scope is set (legacy links: show all published activities in tabs).
 */
export function sevaActivitiesPageSearchParamsToApiQuery(sp: SearchGet): URLSearchParams | null {
  const rawScope = (sp.get("sevaScope") || "").trim().toUpperCase();
  const level = (sp.get("level") || "").toLowerCase();
  const effectiveScope =
    rawScope === "CENTER" || rawScope === "REGIONAL" || rawScope === "NATIONAL"
      ? rawScope
      : level === "regional"
        ? "REGIONAL"
        : level === "national"
          ? "NATIONAL"
          : level === "center"
            ? "CENTER"
            : null;

  if (!effectiveScope) {
    return null;
  }

  const p = new URLSearchParams();
  p.set("sevaScope", effectiveScope);

  const category = sp.get("category");
  if (category && category !== "All") {
    p.set("category", category);
  }

  if (effectiveScope === "CENTER") {
    const city = sp.get("city");
    const usaRegion = sp.get("usaRegion");
    if (city && city !== "All") {
      p.set("city", city);
    }
    if (usaRegion && usaRegion !== "All") {
      p.set("usaRegion", usaRegion);
    }
  } else if (effectiveScope === "REGIONAL") {
    const usaRegion = sp.get("usaRegion");
    if (usaRegion && usaRegion !== "All") {
      p.set("usaRegion", usaRegion);
    }
  }

  const fromDate = sp.get("fromDate") || "";
  const toDate = sp.get("toDate") || "";
  appendDateRange(p, fromDate, toDate);

  return p;
}
