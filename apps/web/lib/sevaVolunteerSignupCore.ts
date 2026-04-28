import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { sevaSignupParticipantTotal } from "@/lib/sevaCapacity";

export type VolunteerSignupDb = typeof prisma | Prisma.TransactionClient;

const activitySelectForSignup = {
  id: true,
  title: true,
  coordinatorName: true,
  coordinatorEmail: true,
  coordinatorPhone: true,
  capacity: true,
  allowKids: true,
  joinSevaEnabled: true,
  startDate: true,
  startTime: true,
  endTime: true,
  locationName: true,
  address: true,
} as const;

export type ActivityForJoinEmail = {
  id: string;
  title: string | null;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  coordinatorPhone: string | null;
  startDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  address: string | null;
};

/**
 * Creates one on-site volunteer signup (Join Seva). Caller sends confirmation emails.
 * @throws Error with message for business rule failures (not found, duplicate, etc.)
 */
export async function createVolunteerSignup(
  db: VolunteerSignupDb,
  input: {
    activityId: string;
    volunteerName: string;
    email: string;
    phone: string | null;
    adultsCount: number;
    kidsCount: number;
  }
): Promise<{
  signup: { id: string; status: "APPROVED" | "PENDING" };
  activity: ActivityForJoinEmail;
}> {
  const { activityId, volunteerName: name, email, phone, adultsCount, kidsCount } = input;

  const activity = await db.sevaActivity.findFirst({
    where: { id: activityId, isActive: true },
    select: activitySelectForSignup,
  });
  if (!activity) {
    throw new Error("Activity not found or not active");
  }
  if (!activity.allowKids && kidsCount > 0) {
    throw new Error("Kids sign-up is not available for this activity.");
  }
  if (!activity.joinSevaEnabled) {
    throw new Error("Join Seva is disabled for this activity. Please use Items to sign up.");
  }

  const existingSignup = await db.sevaSignup.findFirst({
    where: {
      activityId,
      email: { equals: email, mode: "insensitive" },
      status: { not: "CANCELLED" },
    },
    select: { id: true },
  });
  if (existingSignup) {
    throw new Error(`You are already registered for “${activity.title ?? "this activity"}”.`);
  }

  const existingSignups = await db.sevaSignup.findMany({
    where: { activityId, status: "APPROVED" },
    select: { adultsCount: true, kidsCount: true },
  });
  let currentParticipants = 0;
  for (const s of existingSignups) {
    currentParticipants += sevaSignupParticipantTotal(s);
  }
  const newParticipants = adultsCount + kidsCount;
  const capacity = activity.capacity != null && activity.capacity > 0 ? activity.capacity : null;
  const overCapacity = capacity != null && currentParticipants + newParticipants > capacity;
  const status: "APPROVED" | "PENDING" = overCapacity ? "PENDING" : "APPROVED";

  const signup = await db.sevaSignup.create({
    data: {
      activityId,
      volunteerName: name,
      email,
      phone,
      adultsCount,
      kidsCount,
      status,
    },
    select: { id: true, status: true },
  });

  return {
    signup: { id: signup.id, status: signup.status as "APPROVED" | "PENDING" },
    activity,
  };
}
