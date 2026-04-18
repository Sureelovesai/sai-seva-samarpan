import type { SevaActivityScope } from "@/generated/prisma";

export type SevaGroupScopeRow = {
  scope: SevaActivityScope;
  city: string;
  sevaUsaRegion: string | null;
};

/** True when an activity may be assigned to this group (same level + location). */
export function activityMatchesGroup(
  activity: SevaGroupScopeRow,
  group: SevaGroupScopeRow
): boolean {
  if (activity.scope !== group.scope) return false;
  if (activity.scope === "REGIONAL") {
    // Regional listing "city" is free-text per activity; grouping is by USA region only.
    return (activity.sevaUsaRegion || "").trim() === (group.sevaUsaRegion || "").trim();
  }
  if (activity.city.trim() !== group.city.trim()) return false;
  return true;
}
