import { prisma } from "@/lib/prisma";
import type { SessionWithRole } from "@/lib/getRole";
import { hasRole } from "@/lib/getRole";

export type ApprovedCommunityProfile = {
  id: string;
  organizationName: string;
  city: string;
};

export async function getApprovedCommunityProfile(
  userId: string
): Promise<ApprovedCommunityProfile | null> {
  const p = await prisma.communityOutreachProfile.findUnique({
    where: { userId },
    select: { id: true, organizationName: true, city: true, status: true },
  });
  if (!p || p.status !== "APPROVED") return null;
  return { id: p.id, organizationName: p.organizationName, city: p.city };
}

/** Activities created via Community Outreach share org name + city with the approved profile. */
export function communityActivityOwnedByProfile(
  profile: { organizationName: string; city: string },
  activity: { listedAsCommunityOutreach: boolean; organizationName: string | null; city: string | null }
): boolean {
  if (!activity.listedAsCommunityOutreach) return false;
  const on = activity.organizationName?.trim().toLowerCase() ?? "";
  const oc = activity.city?.trim().toLowerCase() ?? "";
  return (
    on === profile.organizationName.trim().toLowerCase() &&
    oc === profile.city.trim().toLowerCase()
  );
}

export function orgActivityWhere(profile: ApprovedCommunityProfile) {
  return {
    listedAsCommunityOutreach: true,
    organizationName: { equals: profile.organizationName, mode: "insensitive" as const },
    city: { equals: profile.city, mode: "insensitive" as const },
  };
}

/** All seva activities posted through Community Network (for site ADMIN oversight). */
export function allCommunityOutreachActivitiesWhere() {
  return { listedAsCommunityOutreach: true as const };
}

export function isCommunityOutreachSiteAdmin(session: SessionWithRole | null): boolean {
  return hasRole(session, "ADMIN");
}
