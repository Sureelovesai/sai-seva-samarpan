import { NextResponse } from "next/server";
import { getSessionWithRole, hasRole } from "@/lib/getRole";
import { buildSevaActivityWorkbookBuffer } from "@/lib/sevaExcelWorkbook";

/**
 * GET /api/admin/seva-activities/excel-template
 * Blank workbook: Instructions, Add Seva Activity, Contribution items (examples), Join Seva Activity.
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(session, "ADMIN", "SEVA_COORDINATOR")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buf = await buildSevaActivityWorkbookBuffer({ mode: "blank", items: [] });
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="seva-activity-template-blank.xlsx"',
      },
    });
  } catch (e: unknown) {
    console.error("excel-template GET error:", e);
    return NextResponse.json(
      { error: "Failed to build template", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
