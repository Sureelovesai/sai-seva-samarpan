import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import { sessionCanAccessAdminSevaActivity } from "@/lib/sevaCoordinatorActivityAccess";
import { promotePendingSignupsForActivity } from "@/lib/sevaSignupPromotion";

/**
 * DELETE /api/admin/seva-signups/[id]
 * Permanently delete a signup. Use for "Cancel" in View Sign Ups.
 * Total Volunteers and Total Hours in Seva Admin Dashboard will reflect the deletion.
 * Admin or Seva Coordinator (coordinator only for their cities).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Signup ID required" }, { status: 400 });
    }

    const signup = await prisma.sevaSignup.findUnique({
      where: { id },
      include: { activity: { select: { city: true, scope: true, sevaUsaRegion: true } } },
    });
    if (!signup) return NextResponse.json({ error: "Signup not found" }, { status: 404 });

    if (!signup.activity || !sessionCanAccessAdminSevaActivity(session, signup.activity)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activityId = signup.activityId;
    const freedApprovedSeat = signup.status === "APPROVED";

    await prisma.sevaSignup.delete({
      where: { id },
    });

    if (freedApprovedSeat) {
      try {
        await promotePendingSignupsForActivity(activityId);
      } catch (promoErr) {
        console.error("Admin seva-signups DELETE: promote pending failed", promoErr);
      }
    }

    return NextResponse.json({ ok: true, deleted: id });
  } catch (e: unknown) {
    console.error("Admin seva-signups DELETE error:", e);
    return NextResponse.json(
      { error: "Failed to delete sign-up", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/seva-signups/[id]
 * Update signup status (e.g. cancel).
 * Body: { status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" }
 * Admin or Seva Coordinator (coordinator only for their cities).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body?.status?.toUpperCase?.();

    if (!id) {
      return NextResponse.json({ error: "Signup ID required" }, { status: 400 });
    }

    const existing = await prisma.sevaSignup.findUnique({
      where: { id },
      include: { activity: { select: { city: true, scope: true, sevaUsaRegion: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Signup not found" }, { status: 404 });

    if (!existing.activity || !sessionCanAccessAdminSevaActivity(session, existing.activity)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowed = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
    if (!status || !allowed.includes(status)) {
      return NextResponse.json(
        { error: "Valid status required (PENDING, APPROVED, REJECTED, CANCELLED)" },
        { status: 400 }
      );
    }

    const signup = await prisma.sevaSignup.update({
      where: { id },
      data: { status: status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" },
      include: { activity: { select: { id: true, title: true } } },
    });

    // Promote waitlist only when an APPROVED seat is freed (moved off APPROVED)
    const freedApprovedSeat =
      existing.status === "APPROVED" && status !== "APPROVED";
    if (freedApprovedSeat) {
      try {
        await promotePendingSignupsForActivity(existing.activityId);
      } catch (promoErr) {
        console.error("Admin seva-signups PATCH: promote pending failed", promoErr);
      }
    }

    return NextResponse.json(signup);
  } catch (e: unknown) {
    console.error("Admin seva-signups PATCH error:", e);
    return NextResponse.json(
      { error: "Failed to update sign-up", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
