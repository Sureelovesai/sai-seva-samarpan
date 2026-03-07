import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";

const VALID_ROLES = ["ADMIN", "VOLUNTEER", "SEVA_COORDINATOR"] as const;

/**
 * PATCH /api/admin/roles/[id]
 * Body: { email?: string, role?: string, cities?: string }
 * Admin only.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const email = body?.email?.trim?.();
    const role = body?.role?.trim?.();
    const cities = body?.cities !== undefined ? (body?.cities?.trim?.() || null) : undefined;

    const data: { email?: string; role?: (typeof VALID_ROLES)[number]; cities?: string | null } = {};
    if (email !== undefined) data.email = email;
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
        return NextResponse.json(
          { error: "Role must be one of: ADMIN, VOLUNTEER, SEVA_COORDINATOR" },
          { status: 400 }
        );
      }
      data.role = role as (typeof VALID_ROLES)[number];
      if (role !== "SEVA_COORDINATOR") data.cities = null;
    }
    if (cities !== undefined) data.cities = role === "SEVA_COORDINATOR" ? cities : null;

    const updated = await prisma.roleAssignment.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Role assignment not found" }, { status: 404 });
    }
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A role assignment for this email already exists" }, { status: 409 });
    }
    console.error("Roles PATCH error:", e);
    return NextResponse.json(
      { error: "Failed to update role", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/roles/[id]
 * Admin only.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await prisma.roleAssignment.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Role assignment not found" }, { status: 404 });
    }
    console.error("Roles DELETE error:", e);
    return NextResponse.json(
      { error: "Failed to delete role", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
