import type { Prisma } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { formatActivityDateTime } from "@/lib/formatSevaDateTime";
import { isActivityEnded } from "@/lib/activityEnded";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type LineInput = { itemId?: string; quantity?: number };

/**
 * POST /api/seva-activities/[id]/contributions/register-items
 * Registers one or more item contributions in a single transaction, then sends:
 * 1. One confirmation email to the contributor.
 * 2. One notification to the seva coordinator (if coordinatorEmail is set).
 * Body: { volunteerName, email, phone?, items: { itemId, quantity }[] }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: activityId } = await params;
    if (!activityId) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const volunteerName = typeof body.volunteerName === "string" ? body.volunteerName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
    const rawItems = body.items;

    if (!volunteerName || !email) {
      return NextResponse.json({ error: "volunteerName and email are required" }, { status: 400 });
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
    }

    const activity = await prisma.sevaActivity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        title: true,
        isActive: true,
        status: true,
        coordinatorName: true,
        coordinatorEmail: true,
        coordinatorPhone: true,
        locationName: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!activity || !activity.isActive || activity.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    if (isActivityEnded(activity)) {
      return NextResponse.json(
        { error: "This activity has ended; item sign-up is closed." },
        { status: 400 }
      );
    }

    const lines: { itemId: string; quantity: number; itemName: string }[] = [];
    for (const row of rawItems as LineInput[]) {
      const itemId = typeof row.itemId === "string" ? row.itemId.trim() : "";
      const quantity = Math.max(1, Math.floor(Number(row.quantity) || 1));
      if (!itemId) {
        return NextResponse.json({ error: "Each item must have itemId" }, { status: 400 });
      }
      const item = await prisma.sevaContributionItem.findFirst({
        where: { id: itemId, activityId },
        select: { id: true, name: true, maxQuantity: true },
      });
      if (!item) {
        return NextResponse.json({ error: `Item not found: ${itemId}` }, { status: 404 });
      }
      lines.push({ itemId: item.id, quantity, itemName: item.name });
    }

    const createdIds: string[] = [];

    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const line of lines) {
          const itemRow = await tx.sevaContributionItem.findFirst({
            where: { id: line.itemId, activityId },
          });
          if (!itemRow) throw new Error("Item missing");

          const agg = await tx.sevaContributionClaim.aggregate({
            where: { itemId: line.itemId, status: "CONFIRMED" },
            _sum: { quantity: true },
          });
          const filled = agg._sum.quantity ?? 0;
          const remaining = itemRow.maxQuantity - filled;
          if (line.quantity > remaining) {
            throw new Error(
              remaining <= 0
                ? `${itemRow.name}: fully covered.`
                : `${itemRow.name}: only ${remaining} unit(s) still needed.`
            );
          }

          const claim = await tx.sevaContributionClaim.create({
            data: {
              itemId: line.itemId,
              quantity: line.quantity,
              volunteerName,
              email,
              phone,
              status: "CONFIRMED",
            },
          });
          createdIds.push(claim.id);
        }
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const activityTitle = activity.title ?? "Seva Activity";
    const startStr = formatActivityDateTime(activity.startDate, activity.startTime, activity.endTime);
    const coordName = activity.coordinatorName?.trim() || "the coordinator";
    const coordEmail = activity.coordinatorEmail?.trim();
    const coordPhone = activity.coordinatorPhone?.trim();
    const contactLine =
      coordEmail || coordPhone
        ? ` If you have questions, contact ${escapeHtml(coordName)}${coordEmail ? ` at ${escapeHtml(coordEmail)}` : ""}${coordPhone ? `${coordEmail ? " or" : ""} ${escapeHtml(coordPhone)}` : ""}.`
        : "";

    const listHtml = lines
      .map(
        (l) =>
          `<li><strong>${escapeHtml(l.itemName)}</strong> — ${l.quantity} unit${l.quantity === 1 ? "" : "s"}</li>`
      )
      .join("");

    const volunteerResult = await sendEmail({
      to: email,
      subject: `Item registration recorded: ${activityTitle}`,
      html: `
        <p>Dear ${escapeHtml(volunteerName)},</p>
        <p>Thank you. Your offer to bring supplies for <strong>${escapeHtml(activityTitle)}</strong> has been recorded.</p>
        <p><strong>When:</strong> ${escapeHtml(startStr)}</p>
        ${activity.locationName ? `<p><strong>Location:</strong> ${escapeHtml(activity.locationName)}</p>` : ""}
        <p><strong>You registered to bring:</strong></p>
        <ul>${listHtml}</ul>
        <p>This is separate from <strong>Join Seva</strong> (on-site volunteering). If you will also attend in person, complete <strong>Join Seva</strong> on the same activity page so the coordinator can plan attendance.${contactLine}</p>
        <p>You will receive a reminder about your item commitment before the activity if you are not already on the volunteer roster for this event.</p>
        <p>Jai Sai Ram.</p>
      `,
    });
    if (!volunteerResult.ok) {
      console.error(
        "register-items: volunteer email failed",
        volunteerResult.error ?? volunteerResult.skipped
      );
    }

    if (coordEmail) {
      const coordResult = await sendEmail({
        to: coordEmail,
        subject: `Item contribution(s): ${activityTitle}`,
        html: `
          <p>Someone registered to bring supplies for your seva activity.</p>
          <p><strong>Activity:</strong> ${escapeHtml(activityTitle)}</p>
          <p><strong>Start:</strong> ${escapeHtml(startStr)}</p>
          ${activity.locationName ? `<p><strong>Location:</strong> ${escapeHtml(activity.locationName)}</p>` : ""}
          <p><strong>Contributor:</strong> ${escapeHtml(volunteerName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
          <p><strong>Items:</strong></p>
          <ul>${listHtml}</ul>
          <p><em>Note:</em> This person used <strong>Register</strong> (items only), not necessarily <strong>Join Seva</strong>. Check <strong>Seva Sign Ups</strong> for on-site volunteers.</p>
          <p>Jai Sai Ram.</p>
        `,
      });
      if (!coordResult.ok) {
        console.error(
          "register-items: coordinator email failed",
          coordResult.error ?? coordResult.skipped
        );
      }
    }

    return NextResponse.json({
      ok: true,
      claimIds: createdIds,
      count: createdIds.length,
    });
  } catch (e: unknown) {
    console.error("POST register-items error:", e);
    return NextResponse.json(
      { error: "Failed to register items", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
