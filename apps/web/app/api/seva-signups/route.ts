import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * POST /api/seva-signups
 * Create a volunteer sign-up from the Seva Activities "Join Seva" form.
 * Sends:
 * 1. Confirmation email to the volunteer.
 * 2. Notification email to the seva coordinator (if coordinatorEmail is set).
 * 24h before activity start, volunteers and coordinator get reminders via /api/cron/seva-reminders.
 * Body: { activityId: string, name: string, email: string, phone?: string, adultsCount?: number, kidsCount?: number }
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
    if (adultsCount + kidsCount < 1) {
      return NextResponse.json(
        { error: "At least one participant (adults or kids) is required" },
        { status: 400 }
      );
    }

    const activity = await prisma.sevaActivity.findFirst({
      where: { id: activityId, isActive: true },
      select: {
        id: true,
        title: true,
        coordinatorName: true,
        coordinatorEmail: true,
        capacity: true,
        startDate: true,
        locationName: true,
      },
    });
    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found or not active" },
        { status: 404 }
      );
    }

    // Count current participants (sum of adults + kids) for PENDING + APPROVED signups
    const existingSignups = await prisma.sevaSignup.findMany({
      where: {
        activityId,
        status: { in: ["PENDING", "APPROVED"] },
      },
      select: { adultsCount: true, kidsCount: true },
    });
    type SignupCounts = { adultsCount?: number; kidsCount?: number };
    const currentParticipants = existingSignups.reduce(
      (sum, s: SignupCounts) => sum + (s.adultsCount ?? 1) + (s.kidsCount ?? 0),
      0
    );
    const newParticipants = adultsCount + kidsCount;
    const capacity = activity.capacity != null && activity.capacity > 0 ? activity.capacity : null;
    const overCapacity = capacity != null && currentParticipants + newParticipants > capacity;
    const status = overCapacity ? "PENDING" : "APPROVED";

    const signup = await prisma.sevaSignup.create({
      data: {
        activityId,
        volunteerName: name,
        email,
        phone,
        adultsCount,
        kidsCount,
        status,
      },
    });

    const activityTitle = activity.title ?? "Seva Activity";
    const coordinatorName = activity.coordinatorName ?? "the coordinator";

    const volunteerEmailResult = await sendEmail({
      to: email,
      subject: `You've joined: ${activityTitle}`,
      html: `
        <p>Dear ${escapeHtml(name)},</p>
        <p>Thank you for joining the seva activity: <strong>${escapeHtml(activityTitle)}</strong>.</p>
        <p>Your sign-up has been recorded. You will receive a reminder 24 hours before the activity starts.${activity.coordinatorEmail ? ` If you have questions, you may contact ${escapeHtml(coordinatorName)} at ${escapeHtml(activity.coordinatorEmail)}.` : ""}</p>
        <p>Jai Sai Ram.</p>
      `,
    });
    if (!volunteerEmailResult.ok) {
      console.error("Seva signup: volunteer email failed", volunteerEmailResult.error ?? volunteerEmailResult.skipped);
    }

    if (activity.coordinatorEmail?.trim()) {
      const startStr = activity.startDate
        ? activity.startDate.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
        : "TBD";
      const coordinatorEmailResult = await sendEmail({
        to: activity.coordinatorEmail.trim(),
        subject: `New volunteer joined: ${activityTitle}`,
        html: `
          <p>A new volunteer has signed up for your seva activity.</p>
          <p><strong>Activity:</strong> ${escapeHtml(activityTitle)}</p>
          <p><strong>Start:</strong> ${escapeHtml(startStr)}</p>
          ${activity.locationName ? `<p><strong>Location:</strong> ${escapeHtml(activity.locationName)}</p>` : ""}
          <p><strong>Volunteer:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
          <p><strong>Participants:</strong> ${adultsCount} adult(s), ${kidsCount} child(ren) — ${adultsCount + kidsCount} total</p>
          <p>Jai Sai Ram.</p>
        `,
      });
      if (!coordinatorEmailResult.ok) {
        console.error("Seva signup: coordinator email failed", coordinatorEmailResult.error ?? coordinatorEmailResult.skipped);
      }
    }

    return NextResponse.json(signup, { status: 201 });
  } catch (e: any) {
    console.error("Seva signup error:", e);
    const message = e?.message ?? String(e);
    const hint =
      typeof message === "string" && (message.includes("sevaSignup") || message.includes("SevaSignup") || message.includes("does not exist"))
        ? " Run: npx prisma generate && npx prisma migrate dev"
        : "";
    return NextResponse.json(
      { error: "Failed to save sign-up", detail: message + hint },
      { status: 500 }
    );
  }
}
