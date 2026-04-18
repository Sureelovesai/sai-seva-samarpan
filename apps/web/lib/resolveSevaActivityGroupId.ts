import type { SevaActivityScope } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { SessionWithRole } from "@/lib/getRole";
import { sessionCanAccessAdminSevaActivityGroup } from "@/lib/sevaActivityGroupAccess";
import { activityMatchesGroup } from "@/lib/sevaActivityGroupMatch";

type ActivityScopePayload = {
  scope: SevaActivityScope;
  city: string;
  sevaUsaRegion: string | null;
};

/**
 * Validates optional groupId for create/update. Returns resolved id or null.
 * Throws ResponseError with .status for API handlers.
 */
export async function resolveGroupIdForActivity(
  session: SessionWithRole,
  groupId: unknown,
  activity: ActivityScopePayload
): Promise<string | null> {
  if (groupId === undefined || groupId === null || String(groupId).trim() === "") {
    return null;
  }
  const id = String(groupId).trim();
  const g = await prisma.sevaActivityGroup.findUnique({ where: { id } });
  if (!g) {
    const err = new Error("Activity group not found");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  if (!sessionCanAccessAdminSevaActivityGroup(session, g)) {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  if (!activityMatchesGroup(activity, g)) {
    const err = new Error("Group does not match this activity’s level and location");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  return id;
}
