import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole, type SessionWithRole } from "@/lib/getRole";
import { syncSevaContributionItems } from "@/lib/syncSevaContributionItems";
import { sendEmail } from "@/lib/email";
import { promotePendingSignupsForActivity } from "@/lib/sevaSignupPromotion";
import {
  communityActivityOwnedByProfile,
  getApprovedCommunityProfile,
  type ApprovedCommunityProfile,
} from "@/lib/communityOutreachOwnership";

export const dynamic = "force-dynamic";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const contributionInclude = {
  contributionItems: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      claims: {
        where: { status: "CONFIRMED" as const },
        orderBy: { createdAt: "asc" as const },
        select: {
          id: true,
          quantity: true,
          volunteerName: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
    },
  },
} as const;

type ActivityWithContributionInclude = Prisma.SevaActivityGetPayload<{
  include: typeof contributionInclude;
}>;

async function loadOwnedActivity(
  id: string,
  session: SessionWithRole
): Promise<{
  profile: ApprovedCommunityProfile | null;
  activity: ActivityWithContributionInclude | null;
  isAdmin: boolean;
}> {
  const isAdmin = hasRole(session, "ADMIN");
  const activity = await prisma.sevaActivity.findUnique({
    where: { id },
    include: contributionInclude,
  });
  if (!activity) {
    return { profile: null, activity: null, isAdmin };
  }
  if (!activity.listedAsCommunityOutreach) {
    return { profile: null, activity: null, isAdmin };
  }

  if (isAdmin) {
    const profile = await getApprovedCommunityProfile(session.sub);
    return { profile, activity, isAdmin: true };
  }

  const profile = await getApprovedCommunityProfile(session.sub);
  if (!profile || !communityActivityOwnedByProfile(profile, activity)) {
    return { profile, activity: null, isAdmin: false };
  }
  return { profile, activity, isAdmin: false };
}

/**
 * GET /api/community-outreach/activities/[id]
 * One activity for edit (org owner only).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(_req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Activity ID required" }, { status: 400 });

    const { profile, activity, isAdmin } = await loadOwnedActivity(id, session);
    if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    if (!isAdmin && !profile) {
      return NextResponse.json(
        { error: "Your organization profile must be approved to manage activities." },
        { status: 403 }
      );
    }

    return NextResponse.json(activity);
  } catch (e: unknown) {
    console.error("GET community-outreach/activities/[id]:", e);
    return NextResponse.json(
      { error: "Failed to load activity", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/community-outreach/activities/[id]
 * Update listing; org name, city, and community listing flag stay tied to the approved profile.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Activity ID required" }, { status: 400 });

    const { profile, activity: existing, isAdmin } = await loadOwnedActivity(id, session);
    if (!existing) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    if (!isAdmin && !profile) {
      return NextResponse.json(
        { error: "Your organization profile must be approved to manage activities." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const oldCapacity = existing.capacity;

    const cityOrg = isAdmin
      ? {
          city:
            body.city != null && String(body.city).trim()
              ? String(body.city).trim()
              : String(existing.city ?? ""),
          organizationName:
            body.organizationName != null && String(body.organizationName).trim()
              ? String(body.organizationName).trim()
              : String(existing.organizationName ?? ""),
        }
      : { city: profile!.city, organizationName: profile!.organizationName };

    const updated = await prisma.sevaActivity.update({
      where: { id },
      data: {
        title: body.title != null ? String(body.title).trim() : undefined,
        category: body.category != null ? String(body.category).trim() || undefined : undefined,
        description: body.description != null ? String(body.description).trim() || undefined : undefined,

        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        startTime: body.startTime != null ? String(body.startTime).trim() || undefined : undefined,
        endTime: body.endTime != null ? String(body.endTime).trim() || undefined : undefined,
        durationHours:
          typeof body.durationHours === "number" && body.durationHours >= 0
            ? body.durationHours
            : body.durationHours === null || body.durationHours === ""
              ? null
              : undefined,

        city: cityOrg.city,
        organizationName: cityOrg.organizationName,
        locationName: body.locationName != null ? String(body.locationName).trim() || undefined : undefined,
        address: body.address != null ? String(body.address).trim() || undefined : undefined,

        capacity: body.capacity !== undefined ? toIntOrNull(body.capacity) : undefined,

        coordinatorName: body.coordinatorName != null ? String(body.coordinatorName).trim() || undefined : undefined,
        coordinatorEmail: body.coordinatorEmail != null ? String(body.coordinatorEmail).trim() || undefined : undefined,
        coordinatorPhone: body.coordinatorPhone != null ? String(body.coordinatorPhone).trim() || undefined : undefined,

        imageUrl: body.imageUrl != null ? String(body.imageUrl).trim() || undefined : undefined,

        isActive:
          body.status === "ARCHIVED"
            ? false
            : body.isActive === undefined
              ? undefined
              : Boolean(body.isActive),
        status:
          body.status === "DRAFT" || body.status === "PUBLISHED" || body.status === "ARCHIVED"
            ? body.status
            : undefined,
        listedAsCommunityOutreach: true,
      },
    });

    const newCapacity = updated.capacity;
    const capacityIncreased =
      newCapacity != null &&
      newCapacity > 0 &&
      (oldCapacity == null || oldCapacity <= 0 || newCapacity > oldCapacity);
    if (capacityIncreased) {
      try {
        await promotePendingSignupsForActivity(id);
      } catch (promoErr) {
        console.error("community-outreach PATCH: promote pending failed", promoErr);
      }
    }

    if (Array.isArray(body.contributionItems)) {
      try {
        await syncSevaContributionItems(id, body.contributionItems);
      } catch (syncErr: unknown) {
        return NextResponse.json(
          {
            error: "Failed to update item list",
            detail: syncErr instanceof Error ? syncErr.message : String(syncErr),
          },
          { status: 400 }
        );
      }
    }

    const withItems = await prisma.sevaActivity.findUnique({
      where: { id },
      include: contributionInclude,
    });

    return NextResponse.json(withItems ?? updated);
  } catch (e: unknown) {
    console.error("PATCH community-outreach/activities/[id]:", e);
    return NextResponse.json(
      { error: "Failed to update activity", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community-outreach/activities/[id]
 * Remove listing; emails volunteers like admin delete.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(_req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Activity ID required" }, { status: 400 });

    const { profile, activity, isAdmin } = await loadOwnedActivity(id, session);
    if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    if (!isAdmin && !profile) {
      return NextResponse.json(
        { error: "Your organization profile must be approved to manage activities." },
        { status: 403 }
      );
    }

    const full = await prisma.sevaActivity.findUnique({
      where: { id },
      include: {
        signups: {
          where: { status: { in: ["PENDING", "APPROVED"] } },
          select: { email: true, volunteerName: true },
        },
      },
    });
    if (!full) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

    const title = full.title ?? "Seva Activity";
    const coordName = full.coordinatorName?.trim() || "the coordinator";
    const coordEmail = full.coordinatorEmail?.trim();
    const coordPhone = full.coordinatorPhone?.trim();

    const coordinatorBlock =
      coordEmail || coordPhone
        ? `<p><strong>Coordinator contact (for questions):</strong></p><ul>${coordName ? `<li>Name: ${escapeHtml(coordName)}</li>` : ""}${coordEmail ? `<li>Email: ${escapeHtml(coordEmail)}</li>` : ""}${coordPhone ? `<li>Phone: ${escapeHtml(coordPhone)}</li>` : ""}</ul>`
        : `<p>For questions, please contact ${escapeHtml(coordName)}.</p>`;

    const emailed = new Set<string>();
    for (const s of full.signups) {
      const to = s.email?.trim();
      if (!to || emailed.has(to.toLowerCase())) continue;
      emailed.add(to.toLowerCase());
      const name = s.volunteerName?.trim() || "Volunteer";
      const result = await sendEmail({
        to,
        subject: `Cancelled: ${title}`,
        html: `
          <p>Dear ${escapeHtml(name)},</p>
          <p>The seva activity <strong>${escapeHtml(title)}</strong> has been <strong>cancelled</strong> and removed from the schedule. Your sign-up for this activity is no longer active.</p>
          <p>We apologize for any inconvenience.</p>
          ${coordinatorBlock}
          <p>Jai Sai Ram.</p>
        `,
      });
      if (!result.ok) {
        console.error("Community outreach activity delete: volunteer email failed", to, result.error ?? result.skipped);
      }
    }

    await prisma.sevaActivity.delete({ where: { id } });

    return NextResponse.json({
      ok: true,
      deleted: id,
      emailsSent: emailed.size,
    });
  } catch (e: unknown) {
    console.error("DELETE community-outreach/activities/[id]:", e);
    return NextResponse.json(
      { error: "Failed to delete activity", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
