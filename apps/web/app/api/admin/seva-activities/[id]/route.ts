import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import { syncSevaContributionItems } from "@/lib/syncSevaContributionItems";
import {
  parseScopeFromBody,
  sessionCanAccessAdminSevaActivity,
  validateSevaScopeForSession,
} from "@/lib/sevaCoordinatorActivityAccess";
import { resolveGroupIdForActivity } from "@/lib/resolveSevaActivityGroupId";
import { sendEmail } from "@/lib/email";
import { promotePendingSignupsForActivity } from "@/lib/sevaSignupPromotion";

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

/**
 * GET /api/admin/seva-activities/[id]
 * Returns a single activity with contribution items + volunteer claims (coordinator dashboard).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER" || session.role === "BLOG_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    const activity = await prisma.sevaActivity.findUnique({
      where: { id },
      include: {
        ...contributionInclude,
        group: { select: { id: true, title: true, status: true, scope: true, city: true, sevaUsaRegion: true } },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    if (!sessionCanAccessAdminSevaActivity(session, activity)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(activity);
  } catch (e: unknown) {
    console.error("Admin seva-activities GET [id] error:", e);
    return NextResponse.json(
      { error: "Failed to load activity", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/seva-activities/[id]
 * Update an existing activity. Same fields as POST create.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER" || session.role === "BLOG_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    const body = await req.json();

    const existing = await prisma.sevaActivity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    if (!sessionCanAccessAdminSevaActivity(session, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const nextScope = body.scope !== undefined ? parseScopeFromBody(body) : existing.scope;
    let nextCity =
      body.city !== undefined ? String(body.city).trim() : (existing.city ?? "").trim();
    const nextSevaUsaRegion =
      body.sevaUsaRegion !== undefined
        ? body.sevaUsaRegion == null || String(body.sevaUsaRegion).trim() === ""
          ? null
          : String(body.sevaUsaRegion).trim()
        : existing.sevaUsaRegion;
    if (nextScope === "NATIONAL" && !nextCity) {
      nextCity = "National";
    }

    const scopeCheck = validateSevaScopeForSession(session, {
      scope: nextScope,
      city: nextCity,
      sevaUsaRegion: nextSevaUsaRegion,
    });
    if (!scopeCheck.ok) {
      return NextResponse.json(
        { error: scopeCheck.error },
        { status: scopeCheck.status ?? 400 }
      );
    }

    const oldCapacity = existing.capacity;

    const geoPatch =
      body.scope !== undefined || body.city !== undefined || body.sevaUsaRegion !== undefined;

    let patchGroupId: string | null | undefined = undefined;
    if (body.groupId !== undefined) {
      try {
        patchGroupId = await resolveGroupIdForActivity(session, body.groupId, {
          scope: nextScope,
          city: nextCity,
          sevaUsaRegion: nextScope === "REGIONAL" ? nextSevaUsaRegion : null,
        });
      } catch (e: unknown) {
        const status = (e as Error & { status?: number }).status ?? 400;
        return NextResponse.json({ error: (e as Error).message }, { status });
      }
    }

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

        scope: geoPatch ? nextScope : undefined,
        sevaUsaRegion: geoPatch
          ? nextScope === "REGIONAL"
            ? nextSevaUsaRegion
            : null
          : undefined,
        city: geoPatch ? nextCity : undefined,
        organizationName:
          body.organizationName != null ? String(body.organizationName).trim() || undefined : undefined,
        locationName: body.locationName != null ? String(body.locationName).trim() || undefined : undefined,
        address: body.address != null ? String(body.address).trim() || undefined : undefined,

        capacity: body.capacity !== undefined ? toIntOrNull(body.capacity) : undefined,
        allowKids: body.allowKids === undefined ? undefined : Boolean(body.allowKids),

        coordinatorName: body.coordinatorName != null ? String(body.coordinatorName).trim() || undefined : undefined,
        coordinatorEmail: body.coordinatorEmail != null ? String(body.coordinatorEmail).trim() || undefined : undefined,
        coordinatorPhone: body.coordinatorPhone != null ? String(body.coordinatorPhone).trim() || undefined : undefined,

        imageUrl: body.imageUrl != null ? String(body.imageUrl).trim() || undefined : undefined,

        // When status is ARCHIVED (event cancelled), always set isActive = false so Active activities count updates
        isActive:
          body.status === "ARCHIVED"
            ? false
            : body.isActive === undefined
              ? undefined
              : Boolean(body.isActive),
        isFeatured: body.isFeatured === undefined ? undefined : Boolean(body.isFeatured),
        status:
          body.status === "DRAFT" || body.status === "PUBLISHED" || body.status === "ARCHIVED"
            ? body.status
            : undefined,

        ...(patchGroupId !== undefined ? { groupId: patchGroupId } : {}),
      },
    });

    // More capacity → approve PENDING signups in FIFO order (same helper as when a seat is freed)
    const newCapacity = updated.capacity;
    const capacityIncreased =
      newCapacity != null &&
      newCapacity > 0 &&
      (oldCapacity == null || oldCapacity <= 0 || newCapacity > oldCapacity);
    if (capacityIncreased) {
      try {
        await promotePendingSignupsForActivity(id);
      } catch (promoErr) {
        console.error(
          "Admin seva-activities PATCH: promote pending after capacity increase failed",
          promoErr
        );
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
      include: {
        ...contributionInclude,
        group: {
          select: { id: true, title: true, status: true, scope: true, city: true, sevaUsaRegion: true },
        },
      },
    });

    return NextResponse.json(withItems ?? updated);
  } catch (e: unknown) {
    console.error("Admin seva-activities PATCH [id] error:", e);
    return NextResponse.json(
      { error: "Failed to update activity", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/seva-activities/[id]
 * Permanently deletes the activity (signups cascade). Before delete, emails
 * PENDING/APPROVED volunteers that the activity was cancelled and includes coordinator contact.
 * Admin or Seva Coordinator (only for activities in their cities).
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
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    const activity = await prisma.sevaActivity.findUnique({
      where: { id },
      include: {
        signups: {
          where: { status: { in: ["PENDING", "APPROVED"] } },
          select: { email: true, volunteerName: true },
        },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    if (!sessionCanAccessAdminSevaActivity(session, activity)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const title = activity.title ?? "Seva Activity";
    const coordName = activity.coordinatorName?.trim() || "the coordinator";
    const coordEmail = activity.coordinatorEmail?.trim();
    const coordPhone = activity.coordinatorPhone?.trim();

    const coordinatorBlock =
      coordEmail || coordPhone
        ? `<p><strong>Coordinator contact (for questions):</strong></p><ul>${coordName ? `<li>Name: ${escapeHtml(coordName)}</li>` : ""}${coordEmail ? `<li>Email: ${escapeHtml(coordEmail)}</li>` : ""}${coordPhone ? `<li>Phone: ${escapeHtml(coordPhone)}</li>` : ""}</ul>`
        : `<p>For questions, please contact ${escapeHtml(coordName)}.</p>`;

    const emailed = new Set<string>();
    for (const s of activity.signups) {
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
        console.error("Activity delete: volunteer email failed", to, result.error ?? result.skipped);
      }
    }

    await prisma.sevaActivity.delete({ where: { id } });

    return NextResponse.json({
      ok: true,
      deleted: id,
      emailsSent: emailed.size,
    });
  } catch (e: unknown) {
    console.error("Admin seva-activities DELETE [id] error:", e);
    return NextResponse.json(
      { error: "Failed to delete activity", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
