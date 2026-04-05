import type { Prisma } from "@/generated/prisma";
import type { SessionWithRole } from "@/lib/getRole";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSevaJoinSignupEmails } from "@/lib/sendSevaJoinSignupEmails";
import { isActivityEnded } from "@/lib/activityEnded";
import { applySevaActivityFromExcel } from "@/lib/applySevaActivityFromExcel";
import { syncContributionItemsFromExcel } from "@/lib/contributionItemsExcel";
import type { BulkGridError } from "@/lib/sevaBulkImport";
import {
  parseAddSevaActivityWorkbook,
  parseBulkVolunteerWorkbook,
  parseContributionItemsWorkbook,
  simulateBulkSignupRows,
} from "@/lib/sevaBulkImport";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function participantCount(s: { adultsCount: number | null; kidsCount: number | null }): number {
  return (s.adultsCount ?? 1) + (s.kidsCount ?? 0);
}

export type BulkWorkbookImportRunResult =
  | {
      ok: true;
      imported: number;
      message: string;
      activityUpdatedFromSheet: boolean;
      contribUpdated: boolean;
    }
  | { ok: false; errors: BulkGridError[] };

/**
 * Shared pipeline: optional Add Seva Activity row 2 apply → Contribution items → Join Seva import + emails.
 */
export async function runBulkWorkbookImportCore(options: {
  buf: Buffer;
  activityId: string;
  session: SessionWithRole;
  /** When true, the activity was just created from row 2 — skip re-applying that sheet. */
  skipApplyAddSheet: boolean;
}): Promise<BulkWorkbookImportRunResult> {
  const { buf, activityId, session, skipApplyAddSheet } = options;

  let activityUpdatedFromSheet = false;

  if (!skipApplyAddSheet) {
    const { errors: addParseErrors, payload: addPayload } = parseAddSevaActivityWorkbook(buf);
    if (addParseErrors.length) {
      return { ok: false, errors: addParseErrors };
    }

    const addApply = await applySevaActivityFromExcel(activityId, addPayload, {
      role: session.role,
      coordinatorCities: session.coordinatorCities ?? undefined,
    });
    if (!addApply.ok) {
      return { ok: false, errors: addApply.errors };
    }
    activityUpdatedFromSheet = addApply.updated;
  } else {
    activityUpdatedFromSheet = true;
  }

  const { errors: ciParseErrors, rows: ciRows } = parseContributionItemsWorkbook(buf);
  if (ciParseErrors.length) {
    return { ok: false, errors: ciParseErrors };
  }

  let contribUpdated = false;
  if (ciRows.length > 0) {
    const syncCi = await syncContributionItemsFromExcel(activityId, ciRows);
    if (!syncCi.ok) {
      return { ok: false, errors: syncCi.errors };
    }
    contribUpdated = true;
  }

  const activityLive = await prisma.sevaActivity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      title: true,
      city: true,
      isActive: true,
      status: true,
      capacity: true,
      coordinatorEmail: true,
      coordinatorName: true,
      coordinatorPhone: true,
      startDate: true,
      startTime: true,
      endTime: true,
      endDate: true,
      durationHours: true,
      locationName: true,
      contributionItems: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, maxQuantity: true },
      },
    },
  });

  if (!activityLive) {
    return {
      ok: false,
      errors: [{ row: 1, column: "—", message: "Activity not found after import step." }],
    };
  }

  const contributionItems = activityLive.contributionItems;

  const validItemIds = new Set<string>(contributionItems.map((it: { id: string }) => it.id));
  const { errors: parseErrors, rows } = parseBulkVolunteerWorkbook(buf, validItemIds);

  if (parseErrors.length) {
    return { ok: false, errors: parseErrors };
  }

  if (rows.length === 0) {
    if (!activityUpdatedFromSheet && !contribUpdated) {
      return {
        ok: false,
        errors: [
          {
            row: 2,
            column: "—",
            message:
              "No volunteer rows on Join Seva Activity, and no updates on Add Seva Activity or Contribution items. Add at least one volunteer row, or edit row 2 on Add Seva Activity / Contribution items.",
          },
        ],
      };
    }
    const message = skipApplyAddSheet
      ? contribUpdated
        ? "Activity was created from the workbook. Contribution items were synced. No volunteer rows were imported."
        : "Activity was created from the workbook. No volunteer rows were imported."
      : "Excel applied: activity and/or contribution items were updated. No new volunteer rows were imported.";
    return {
      ok: true,
      imported: 0,
      message,
      activityUpdatedFromSheet,
      contribUpdated,
    };
  }

  const approvedSignups = await prisma.sevaSignup.findMany({
    where: { activityId, status: "APPROVED" },
    select: { adultsCount: true, kidsCount: true },
  });
  let initialApprovedParticipants = 0;
  for (const s of approvedSignups) initialApprovedParticipants += participantCount(s);

  const itemMax = new Map<string, number>(
    contributionItems.map((it: { id: string; maxQuantity: number }) => [it.id, it.maxQuantity])
  );
  const itemFilled = new Map<string, number>();
  for (const it of contributionItems as { id: string; maxQuantity: number }[]) {
    const agg = await prisma.sevaContributionClaim.aggregate({
      where: { itemId: it.id, status: "CONFIRMED" },
      _sum: { quantity: true },
    });
    itemFilled.set(it.id, agg._sum.quantity ?? 0);
  }

  const cap = activityLive.capacity != null && activityLive.capacity > 0 ? activityLive.capacity : null;
  const simErrors = simulateBulkSignupRows(rows, cap, initialApprovedParticipants, itemFilled, itemMax);
  const allErrors = [...parseErrors, ...simErrors];
  if (allErrors.length) {
    return { ok: false, errors: allErrors };
  }

  const itemNameById = new Map<string, string>(
    contributionItems.map((it: { id: string; name: string }) => [it.id, it.name])
  );
  const sendEmails = !isActivityEnded(activityLive);

  type ImportedSummary = {
    excelRow: number;
    volunteerName: string;
    email: string;
    phone: string | null;
    adultsCount: number;
    kidsCount: number;
    status: "APPROVED" | "PENDING";
    itemLines: { itemName: string; quantity: number }[];
  };
  const imported: ImportedSummary[] = [];

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let usedParticipants = initialApprovedParticipants;

    for (const row of rows) {
      const parts = row.adults_count + row.kids_count;
      let status: "APPROVED" | "PENDING";
      if (row.signup_status === "APPROVED") {
        status = "APPROVED";
      } else if (row.signup_status === "PENDING") {
        status = "PENDING";
      } else {
        const over = cap != null && usedParticipants + parts > cap;
        status = over ? "PENDING" : "APPROVED";
      }

      await tx.sevaSignup.create({
        data: {
          activityId,
          volunteerName: row.volunteer_name,
          email: row.email,
          phone: row.phone,
          adultsCount: row.adults_count,
          kidsCount: row.kids_count,
          status,
          comment: row.comment,
        },
      });

      const itemLines = row.items.map((it) => ({
        itemName: itemNameById.get(it.itemId) ?? it.itemId,
        quantity: it.quantity,
      }));

      for (const it of row.items) {
        await tx.sevaContributionClaim.create({
          data: {
            itemId: it.itemId,
            quantity: it.quantity,
            volunteerName: row.volunteer_name,
            email: row.email,
            phone: row.phone,
            status: "CONFIRMED",
          },
        });
      }

      if (status === "APPROVED") usedParticipants += parts;

      imported.push({
        excelRow: row.excelRow,
        volunteerName: row.volunteer_name,
        email: row.email,
        phone: row.phone,
        adultsCount: row.adults_count,
        kidsCount: row.kids_count,
        status,
        itemLines,
      });
    }
  });

  const emailActivity = {
    title: activityLive.title,
    coordinatorName: activityLive.coordinatorName,
    coordinatorEmail: activityLive.coordinatorEmail,
    coordinatorPhone: activityLive.coordinatorPhone,
    startDate: activityLive.startDate,
    startTime: activityLive.startTime,
    endTime: activityLive.endTime,
    locationName: activityLive.locationName,
  };

  if (sendEmails) {
    for (const row of imported) {
      await sendSevaJoinSignupEmails({
        activity: emailActivity,
        volunteerName: row.volunteerName,
        email: row.email,
        phone: row.phone,
        adultsCount: row.adultsCount,
        kidsCount: row.kidsCount,
        status: row.status,
        itemLines: row.itemLines.length ? row.itemLines : undefined,
        skipCoordinatorEmail: true,
      });
    }

    const coord = activityLive.coordinatorEmail?.trim();
    if (coord) {
      const tableRows = imported
        .map(
          (r) =>
            `<tr><td>${r.excelRow}</td><td>${escapeHtml(r.volunteerName)}</td><td>${escapeHtml(r.email)}</td><td>${r.status}</td><td>${r.adultsCount + r.kidsCount}</td><td>${escapeHtml(r.itemLines.map((l) => `${l.quantity}×${l.itemName}`).join("; ") || "—")}</td></tr>`
        )
        .join("");
      await sendEmail({
        to: coord,
        subject: `Bulk import: ${imported.length} volunteer(s) — ${activityLive.title ?? "Seva Activity"}`,
        html: `
            <p>Bulk registration was completed for <strong>${escapeHtml(activityLive.title ?? "Seva Activity")}</strong>.</p>
            <p><strong>Rows imported:</strong> ${imported.length}</p>
            <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
              <thead><tr><th>Excel row</th><th>Name</th><th>Email</th><th>Status</th><th>Participants</th><th>Items</th></tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
            <p>Jai Sai Ram.</p>
          `,
      });
    }
  }

  let message = sendEmails
    ? `Successfully imported ${imported.length} volunteer row(s). Confirmation emails were sent where mail is configured.`
    : `Successfully imported ${imported.length} volunteer row(s). No emails sent (activity end date is in the past).`;
  if (skipApplyAddSheet) {
    message += " A new seva activity was created and published from Add Seva Activity row 2.";
  } else if (activityUpdatedFromSheet) {
    message += " Add Seva Activity (row 2) was saved from the workbook.";
  }
  if (contribUpdated) message += " Contribution items were synced from the workbook.";

  return {
    ok: true,
    imported: imported.length,
    message,
    activityUpdatedFromSheet,
    contribUpdated,
  };
}
