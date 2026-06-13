/**
 * In-memory cache of the last activities the user browsed, so the details screen
 * can render instantly without a dedicated GET /api/seva-activities/[id] endpoint.
 * (The list endpoint already returns full activity objects.)
 */

import type { SevaActivity } from "@/lib/types";

const cache = new Map<string, SevaActivity>();

export function rememberActivities(list: SevaActivity[]): void {
  for (const a of list) cache.set(a.id, a);
}

export function getCachedActivity(id: string): SevaActivity | undefined {
  return cache.get(id);
}
