import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createVolunteerSignup } from "@/lib/sevaVolunteerSignupCore";
import { sendSevaJoinSignupEmails } from "@/lib/sendSevaJoinSignupEmails";

/**
 * POST /api/seva-signups
 * Create a volunteer sign-up from the Seva Activities "Join Seva" form.
 * Sends:
 * 1. Confirmation email to the volunteer.
 * 2. Notification email to the seva coordinator (if coordinatorEmail is set).
 * 24h before activity start, volunteers and coordinator get reminders via /api/cron/seva-reminders.
 * Capacity uses only APPROVED signups; if joining would exceed capacity, status is PENDING (waitlist).
 * Body: { activityId: string, name: string, email: string, phone: string, adultsCount?: number, kidsCount?: number }
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

    await sendSevaJoinSignupEmails({
      activity,
      volunteerName: name,
      email,
      phone,
      adultsCount,
      kidsCount,
      status: signup.status,
    });

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
