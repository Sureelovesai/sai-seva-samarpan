import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createVolunteerSignup } from "@/lib/sevaVolunteerSignupCore";
import { sendSevaJoinSignupEmails } from "@/lib/sendSevaJoinSignupEmails";
import { sendNotificationToLocation, sendNotificationToRole } from "@/lib/notification-service";

/**
 * POST /api/seva-signups
 * Create a volunteer sign-up from the Seva Activities "Join Seva" form.
 * Sends:
 * 1. Confirmation email to the volunteer.
 * 2. Notification email to the seva coordinator (if coordinatorEmail is set).
 * 24h before activity start, volunteers and coordinator get reminders via /api/cron/seva-reminders.
 * Capacity uses only APPROVED signups; if joining would exceed capacity, status is PENDING (waitlist).
 * Body: { 
 *   activityId: string, 
 *   name: string, 
 *   email: string, 
 *   phone: string, 
 *   adultsCount?: number, 
 *   kidsCount?: number,
 *   participants?: Array<{type: 'adult'|'kid', name?: string, email?: string, phone?: string, groupName?: string}>
 * }
 * adultsCount = adults including the primary volunteer (default 1). Can be 0 when only kids participate. kidsCount = number of children (default 0).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const activityId = body?.activityId?.trim();
    const name = body?.name?.trim();
    const email = body?.email?.trim();
    const phone = body?.phone?.trim() || null;
    const adultsCount = Math.max(0, Math.floor(Number(body?.adultsCount) ?? 1));
    const kidsCount = Math.max(0, Math.floor(Number(body?.kidsCount) || 0));
    const participants = Array.isArray(body?.participants) ? body.participants : [];

    if (!activityId || !name || !email) {
      return NextResponse.json(
        { error: "Activity, name, and email are required" },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }
    if (adultsCount + kidsCount < 1) {
      return NextResponse.json(
        { error: "At least one participant (adults or kids) is required" },
        { status: 400 }
      );
    }

    const { signup, activity } = await createVolunteerSignup(prisma, {
      activityId,
      volunteerName: name,
      email,
      phone,
      adultsCount,
      kidsCount,
    });

    // Create participant records if provided
    if (participants.length > 0) {
      await prisma.sevaSignupParticipant.createMany({
        data: participants.map((p: any) => ({
          sevaSignupId: signup.id,
          type: p.type || "adult",
          name: p.name || null,
          email: p.email || null,
          phone: p.phone || null,
          groupName: p.groupName || null,
        })),
      });
    }

    await sendSevaJoinSignupEmails({
      activity,
      volunteerName: name,
      email,
      phone,
      adultsCount,
      kidsCount,
      status: signup.status,
    });

    // Send push notifications to coordinators and admins about new signup
    try {
      // Fetch the activity to get its city
      const sevaActivity = await prisma.sevaActivity.findUnique({
        where: { id: activityId },
        select: { city: true, title: true },
      });

      if (sevaActivity) {
        // Send location-specific notifications to coordinators in this city
        // AND send global notification to all admins
        await Promise.all([
          sendNotificationToLocation([sevaActivity.city], {
            title: "New Signup for Your Activity",
            body: `${name} signed up for ${sevaActivity.title}`,
            triggerType: "NEW_SIGNUP",
            relatedId: signup.id,
            actionUrl: `/admin/seva-signups`,
          }, "SEVA_COORDINATOR"),
          // Notify all admins about the signup
          sendNotificationToRole("ADMIN", {
            title: "New Volunteer Signup",
            body: `${name} registered for ${sevaActivity.title} (${sevaActivity.city})`,
            triggerType: "NEW_SIGNUP",
            relatedId: signup.id,
            actionUrl: `/admin/seva-signups`,
          }),
        ]);
      }
    } catch (notifErr) {
      console.error("[Notification] Failed to send signup notification:", notifErr);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json(
      { id: signup.id, status: signup.status, activityId },
      { status: 201 }
    );
  } catch (e: unknown) {
    console.error("Seva signup error:", e);
    const message = e instanceof Error ? e.message : String(e);
    const dupOrBiz =
      typeof message === "string" &&
      (message.includes("already registered") || message.includes("not found") || message.includes("not active"));
    if (dupOrBiz) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    const hint =
      typeof message === "string" &&
      (message.includes("sevaSignup") || message.includes("SevaSignup") || message.includes("does not exist"))
        ? " Run: npx prisma generate && npx prisma migrate dev"
        : "";
    return NextResponse.json(
      { error: "Failed to save sign-up", detail: message + hint },
      { status: 500 }
    );
  }
}
