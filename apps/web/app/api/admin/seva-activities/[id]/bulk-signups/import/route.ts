import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole } from "@/lib/getRole";
import { sessionCanAccessAdminSevaActivity } from "@/lib/sevaCoordinatorActivityAccess";
import { BULK_IMPORT_MAX_BYTES } from "@/lib/sevaBulkImport";
import { runBulkWorkbookImportCore } from "@/lib/sevaBulkWorkbookImportRun";

/**
 * POST /api/admin/seva-activities/[id]/bulk-signups/import
 * multipart/form-data field: file (.xlsx / .xls)
 *
 * Applies (when present): Add Seva Activity row 2 → Contribution items → Join Seva Activity rows.
 * Same signup emails and DB behavior as Add Seva Activity + bulk import.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id: activityId } = await params;
    if (!activityId) return NextResponse.json({ error: "Activity ID required" }, { status: 400 });

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

    const activity = await prisma.sevaActivity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        city: true,
        isActive: true,
        status: true,
      },
    });

    if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

    if (!activity.isActive || activity.status !== "PUBLISHED") {
      return NextResponse.json(
        { errors: [{ row: 1, column: "activity", message: "Activity must be active and published." }] },
        { status: 400 }
      );
    }

    if (!sessionCanAccessAdminSevaActivity(session, activity)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await runBulkWorkbookImportCore({
      buf,
      activityId,
      session,
      skipApplyAddSheet: false,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      message: result.message,
    });
  } catch (e: unknown) {
    console.error("bulk-signups import POST error:", e);
    return NextResponse.json(
      { error: "Import failed", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
