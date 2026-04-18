import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import { sessionCanAccessAdminSevaActivityGroup } from "@/lib/sevaActivityGroupAccess";

/**
 * PATCH /api/admin/seva-activity-groups/[id]
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
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await prisma.sevaActivityGroup.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!sessionCanAccessAdminSevaActivityGroup(session, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const updated = await prisma.sevaActivityGroup.update({
      where: { id },
      data: {
        title: body.title != null ? String(body.title).trim() || undefined : undefined,
        description:
          body.description !== undefined
            ? body.description === null
              ? null
              : String(body.description).trim() || null
            : undefined,
        status:
          body.status === "DRAFT" || body.status === "PUBLISHED" || body.status === "ARCHIVED"
            ? body.status
            : undefined,
        sortOrder:
          typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
            ? Math.floor(body.sortOrder)
            : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    console.error("PATCH seva-activity-groups [id]:", e);
    return NextResponse.json(
      { error: "Failed to update group", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/seva-activity-groups/[id]
 * Activities with this groupId become ungrouped (FK SET NULL).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(_req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await prisma.sevaActivityGroup.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!sessionCanAccessAdminSevaActivityGroup(session, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.sevaActivityGroup.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("DELETE seva-activity-groups [id]:", e);
    return NextResponse.json(
      { error: "Failed to delete group", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
