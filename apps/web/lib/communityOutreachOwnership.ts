import { prisma } from "@/lib/prisma";
import type { SessionWithRole } from "@/lib/getRole";
import { hasRole } from "@/lib/getRole";
import type { Prisma } from "@/generated/prisma";

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

/** True if this user created the listing (or legacy row: poster unset but coordinator email matches). */
export function isCommunityOutreachPoster(
  session: SessionWithRole,
  activity: {
    communityOutreachPostedByUserId: string | null;
    coordinatorEmail: string | null;
  }
): boolean {
  if (activity.communityOutreachPostedByUserId === session.sub) return true;
  if (
    activity.communityOutreachPostedByUserId == null &&
    activity.coordinatorEmail?.trim() &&
    activity.coordinatorEmail.trim().toLowerCase() === session.email.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

/** Listed by signed-in user only (poster id or legacy coordinator email). No org filter — use with profile AND when needed. */
export function postedBySessionWhere(session: SessionWithRole): Prisma.SevaActivityWhereInput {
  return {
    listedAsCommunityOutreach: true,
    OR: [
      { communityOutreachPostedByUserId: session.sub },
      {
        communityOutreachPostedByUserId: null,
        coordinatorEmail: { equals: session.email, mode: "insensitive" },
      },
    ],
  };
}

/** Manage Activity list: same org/city, and only rows this user posted. */
export function myPostedCommunityActivitiesWhere(
  profile: ApprovedCommunityProfile,
  session: SessionWithRole
): Prisma.SevaActivityWhereInput {
  return {
    AND: [orgActivityWhere(profile), postedBySessionWhere(session)],
  };
}

/** All seva activities posted through Community Network (for site ADMIN oversight). */
export function allCommunityOutreachActivitiesWhere() {
  return { listedAsCommunityOutreach: true as const };
}

export function isCommunityOutreachSiteAdmin(session: SessionWithRole | null): boolean {
  return hasRole(session, "ADMIN");
}
