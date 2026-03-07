import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";

const VALID_ROLES = ["ADMIN", "VOLUNTEER", "SEVA_COORDINATOR"] as const;

export async function GET(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const list = await prisma.roleAssignment.findMany({
      orderBy: [{ role: "asc" }, { email: "asc" }],
    });
    return NextResponse.json(list);
  } catch (e: unknown) {
    console.error("Roles GET error:", e);
    return NextResponse.json(
      { error: "Failed to load roles", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const email = body?.email?.trim?.();
    const role = body?.role?.trim?.();
    const cities = body?.cities?.trim?.() || null;

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!role || !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
      return NextResponse.json(
        { error: "Role must be one of: ADMIN, VOLUNTEER, SEVA_COORDINATOR" },
        { status: 400 }
      );
    }

    const created = await prisma.roleAssignment.create({
      data: {
        email,
        role: role as (typeof VALID_ROLES)[number],
        cities: role === "SEVA_COORDINATOR" ? cities : null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A role assignment for this email already exists" }, { status: 409 });
    }
    console.error("Roles POST error:", e);
    return NextResponse.json(
      { error: "Failed to create role", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
