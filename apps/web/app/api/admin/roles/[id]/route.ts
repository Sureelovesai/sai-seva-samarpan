import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";

const VALID_ROLES = [
  "ADMIN",
  "BLOG_ADMIN",
  "VOLUNTEER",
  "SEVA_COORDINATOR",
  "REGIONAL_SEVA_COORDINATOR",
  "NATIONAL_SEVA_COORDINATOR",
  "EVENT_ADMIN",
] as const;

/**
 * PATCH /api/admin/roles/[id]
 * Body: { email?: string, role?: string, cities?: string, regions?: string }
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
    const cities = body?.cities !== undefined ? body?.cities?.trim?.() || null : undefined;
    const regions = body?.regions !== undefined ? body?.regions?.trim?.() || null : undefined;

    const existing = await prisma.roleAssignment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Role assignment not found" }, { status: 404 });
    }

    const nextRole = (role ?? existing.role) as (typeof VALID_ROLES)[number];

    if (role !== undefined && !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
      return NextResponse.json(
        {
          error:
            "Role must be one of: ADMIN, BLOG_ADMIN, VOLUNTEER, SEVA_COORDINATOR, REGIONAL_SEVA_COORDINATOR, NATIONAL_SEVA_COORDINATOR, EVENT_ADMIN",
        },
        { status: 400 }
      );
    }

    const data: {
      email?: string;
      role?: (typeof VALID_ROLES)[number];
      cities?: string | null;
      regions?: string | null;
    } = {};
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role as (typeof VALID_ROLES)[number];

    if (role !== undefined || cities !== undefined || regions !== undefined) {
      data.cities = nextRole === "SEVA_COORDINATOR" ? (cities !== undefined ? cities : existing.cities) : null;
      data.regions =
        nextRole === "REGIONAL_SEVA_COORDINATOR"
          ? regions !== undefined
            ? regions
            : existing.regions
          : null;
    }

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
      return NextResponse.json({ error: "This email already has this role assigned" }, { status: 409 });
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
