import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole } from "@/lib/getRole";
import { notifyUserProfileDecision } from "@/lib/communityOutreachNotify";

export const dynamic = "force-dynamic";

function canReviewProfile(
  session: NonNullable<Awaited<ReturnType<typeof getSessionWithRole>>>,
  profileCity: string
): boolean {
  if (hasRole(session, "ADMIN")) return true;
  if (!hasRole(session, "SEVA_COORDINATOR") || !session.coordinatorCities?.length) return false;
  const norm = profileCity.trim().toLowerCase();
  return session.coordinatorCities.some((c) => c.trim().toLowerCase() === norm);
}

/**
 * PATCH /api/admin/community-outreach/profiles/[id]
 * Body: { action: "approve" | "reject", reviewerNote?: string }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasRole(session, "ADMIN", "SEVA_COORDINATOR")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Profile id required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : null;
    if (!action) {
      return NextResponse.json({ error: 'Body must include action: "approve" or "reject"' }, { status: 400 });
    }
    const reviewerNote =
      typeof body.reviewerNote === "string" ? body.reviewerNote.trim().slice(0, 500) : "";

    const existing = await prisma.communityOutreachProfile.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canReviewProfile(session, existing.city)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending profiles can be approved or rejected." },
        { status: 400 }
      );
    }

    const now = new Date();
    const updated = await prisma.communityOutreachProfile.update({
      where: { id },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        reviewedAt: now,
        reviewerNote: action === "reject" && reviewerNote ? reviewerNote : null,
      },
      include: {
        user: { select: { email: true } },
      },
    });

    await notifyUserProfileDecision({
      to: updated.user.email,
      organizationName: updated.organizationName,
      approved: action === "approve",
      note: action === "reject" ? reviewerNote || null : null,
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    console.error("admin community-outreach PATCH:", e);
    return NextResponse.json(
      { error: "Failed to update profile", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/community-outreach/profiles/[id]
 * ADMIN only. Removes a pending organization profile so the submitter can re-apply if needed.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasRole(session, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Profile id required" }, { status: 400 });
    }

    const existing = await prisma.communityOutreachProfile.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending profiles can be deleted. Use reject for other cases." },
        { status: 400 }
      );
    }

    await prisma.communityOutreachProfile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("admin community-outreach DELETE:", e);
    return NextResponse.json(
      { error: "Failed to delete profile", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
