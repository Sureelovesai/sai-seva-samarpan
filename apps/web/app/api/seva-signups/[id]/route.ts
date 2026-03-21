import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { promotePendingSignupsForActivity } from "@/lib/sevaSignupPromotion";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * GET /api/seva-signups/[id]
 * Volunteer can fetch their own signup (email must match session).
 * Used by My Seva Dashboard to show comment and allow edit/withdraw.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromCookie(req.headers.get("cookie"));
    const email = session?.email?.trim()?.toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Signup ID required" }, { status: 400 });
    }

    const signup = await prisma.sevaSignup.findUnique({
      where: { id },
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            startDate: true,
            city: true,
          },
        },
      },
    });
    if (!signup) {
      return NextResponse.json({ error: "Signup not found" }, { status: 404 });
    }
    if (signup.email.trim().toLowerCase() !== email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(signup);
  } catch (e: unknown) {
    console.error("Seva signup GET [id] error:", e);
    return NextResponse.json(
      { error: "Failed to load signup", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/seva-signups/[id]
 * Volunteer can update their own signup: comment and/or withdraw (status CANCELLED).
 * Email must match session.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromCookie(req.headers.get("cookie"));
    const email = session?.email?.trim()?.toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Signup ID required" }, { status: 400 });
    }

    const existing = await prisma.sevaSignup.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Signup not found" }, { status: 404 });
    }
    if (existing.email.trim().toLowerCase() !== email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const comment =
      body?.comment !== undefined
        ? (body.comment === null || body.comment === ""
          ? null
          : String(body.comment).trim() || null)
        : undefined;
    const status = body?.status?.toUpperCase?.();

    const data: { comment?: string | null; status?: "CANCELLED" } = {};
    if (comment !== undefined) data.comment = comment;
    if (status === "CANCELLED") data.status = "CANCELLED";

    if (Object.keys(data).length === 0) {
      return NextResponse.json(existing);
    }

    const signup = await prisma.sevaSignup.update({
      where: { id },
      data,
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            startDate: true,
            city: true,
            coordinatorName: true,
            coordinatorEmail: true,
            coordinatorPhone: true,
          },
        },
      },
    });

    // On withdraw (CANCELLED), email volunteer (with coordinator info) and coordinator
    if (status === "CANCELLED") {
      if (signup.activity) {
      const title = signup.activity.title ?? "Seva Activity";
      const coordName = signup.activity.coordinatorName?.trim() || "the coordinator";
      const coordEmail = signup.activity.coordinatorEmail?.trim();
      const coordPhone = signup.activity.coordinatorPhone?.trim();
      const coordinatorBlock =
        coordEmail || coordPhone
          ? `<p><strong>Coordinator contact (for any follow-up):</strong></p><ul>${coordName ? `<li>Name: ${escapeHtml(coordName)}</li>` : ""}${coordEmail ? `<li>Email: ${escapeHtml(coordEmail)}</li>` : ""}${coordPhone ? `<li>Phone: ${escapeHtml(coordPhone)}</li>` : ""}</ul>`
          : "";

      const volunteerResult = await sendEmail({
        to: existing.email,
        subject: `Withdrawal confirmed: ${title}`,
        html: `
          <p>Dear ${escapeHtml(existing.volunteerName)},</p>
          <p>You have been withdrawn from the seva activity: <strong>${escapeHtml(title)}</strong>.</p>
          <p>If you did not request this or have questions, please contact the activity coordinator.</p>
          ${coordinatorBlock}
          <p>Jai Sai Ram.</p>
        `,
      });
      if (!volunteerResult.ok) {
        console.error("Seva signup withdraw: volunteer email failed", volunteerResult.error ?? volunteerResult.skipped);
      }

      if (coordEmail) {
        const coordinatorResult = await sendEmail({
          to: coordEmail,
          subject: `Volunteer withdrew: ${title}`,
          html: `
            <p>A volunteer has withdrawn from your seva activity.</p>
            <p><strong>Activity:</strong> ${escapeHtml(title)}</p>
            <p><strong>Volunteer:</strong> ${escapeHtml(existing.volunteerName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(existing.email)}</p>
            ${existing.phone ? `<p><strong>Phone:</strong> ${escapeHtml(existing.phone)}</p>` : ""}
            <p>Jai Sai Ram.</p>
          `,
        });
        if (!coordinatorResult.ok) {
          console.error("Seva signup withdraw: coordinator email failed", coordinatorResult.error ?? coordinatorResult.skipped);
        }
      }
      }

      // Only when an APPROVED seat is freed (withdrawing from waitlist does not open capacity)
      if (existing.status === "APPROVED") {
        try {
          await promotePendingSignupsForActivity(signup.activityId);
        } catch (promoErr) {
          console.error("Seva signup withdraw: promote pending failed", promoErr);
        }
      }
    }

    return NextResponse.json(signup);
  } catch (e: unknown) {
    console.error("Seva signup PATCH [id] error:", e);
    return NextResponse.json(
      { error: "Failed to update signup", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
