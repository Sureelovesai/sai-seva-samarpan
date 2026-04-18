import { NextResponse } from "next/server";
import { getSessionWithRole, hasRole } from "@/lib/getRole";
import { createSevaActivityFromExcel } from "@/lib/applySevaActivityFromExcel";
import {
  BULK_IMPORT_MAX_BYTES,
  parseAddSevaActivityWorkbook,
} from "@/lib/sevaBulkImport";
import { runBulkWorkbookImportCore } from "@/lib/sevaBulkWorkbookImportRun";

/**
 * POST /api/admin/seva-activities/bulk-workbook-import
 * multipart/form-data field: file (.xlsx / .xls)
 *
 * Creates a **new published** activity from **Add Seva Activity** row 2, then applies
 * **Contribution items** and **Join Seva Activity** the same way as the per-activity import route.
 * Use when you have not saved an activity on the website yet (blank or filled template).
 */
export async function POST(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (
      !hasRole(
        session,
        "ADMIN",
        "SEVA_COORDINATOR",
        "REGIONAL_SEVA_COORDINATOR",
        "NATIONAL_SEVA_COORDINATOR"
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file field (Excel workbook)." }, { status: 400 });
    }

    const name = (file as File).name?.toLowerCase() ?? "";
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      return NextResponse.json(
        { errors: [{ row: 1, column: "file", message: "Upload an Excel file (.xlsx or .xls)." }] },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > BULK_IMPORT_MAX_BYTES) {
      return NextResponse.json(
        {
          errors: [
            {
              row: 1,
              column: "file",
              message: `File too large (max ${Math.round(BULK_IMPORT_MAX_BYTES / 1024 / 1024)} MB).`,
            },
          ],
        },
        { status: 400 }
      );
    }

    const { errors: addParseErrors, payload: addPayload } = parseAddSevaActivityWorkbook(buf);
    if (addParseErrors.length) {
      return NextResponse.json({ ok: false, errors: addParseErrors }, { status: 400 });
    }

    if (!addPayload) {
      return NextResponse.json(
        {
          ok: false,
          errors: [
            {
              row: 2,
              column: "Add Seva Activity",
              message:
                "Fill row 2 on the **Add Seva Activity** sheet with all required fields (same as the website form): title, category, dates, times, duration, city, address, capacity, and coordinator contact. Then add **Contribution items** and/or **Join Seva Activity** rows as needed.",
            },
          ],
        },
        { status: 400 }
      );
    }

    const created = await createSevaActivityFromExcel(addPayload, {
      role: session.role,
      coordinatorCities: session.coordinatorCities ?? undefined,
    });

    if (!created.ok) {
      return NextResponse.json({ ok: false, errors: created.errors }, { status: 400 });
    }

    const activityId = created.activityId;

    const result = await runBulkWorkbookImportCore({
      buf,
      activityId,
      session,
      skipApplyAddSheet: true,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          errors: result.errors,
          activityId,
          partial: true,
          detail:
            "The seva activity was created and saved. Fix the issues below and upload again; use the same workbook or download a fresh template for this activity to continue.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      message: result.message,
      activityId,
      title: addPayload.title.trim(),
    });
  } catch (e: unknown) {
    console.error("bulk-workbook-import POST error:", e);
    return NextResponse.json(
      { error: "Import failed", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
