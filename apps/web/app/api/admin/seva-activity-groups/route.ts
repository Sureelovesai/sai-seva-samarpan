import { NextResponse } from "next/server";
import type { Prisma, SevaActivityScope } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import {
  adminSevaActivityGroupListWhere,
  sessionCanAccessAdminSevaActivityGroup,
} from "@/lib/sevaActivityGroupAccess";
import { parseScopeFromBody, validateSevaScopeForSession } from "@/lib/sevaCoordinatorActivityAccess";
import { isValidUsaRegion } from "@/lib/usaRegions";

/**
 * GET /api/admin/seva-activity-groups
 * Query: scope, city, sevaUsaRegion — list groups the user may use when creating/editing activities.
 */
export async function GET(req: Request) {
  const session = await getSessionWithRole(req.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "VOLUNTEER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const scopeRaw = (searchParams.get("scope") || "CENTER").trim().toUpperCase();
  const scope =
    scopeRaw === "REGIONAL" || scopeRaw === "NATIONAL" || scopeRaw === "CENTER"
      ? (scopeRaw as SevaActivityScope)
      : "CENTER";
  const city = (searchParams.get("city") || "").trim();
  const sevaUsaRegion = (searchParams.get("sevaUsaRegion") || "").trim() || null;

  const scopeWhere = adminSevaActivityGroupListWhere(session);
  const matchWhere: Prisma.SevaActivityGroupWhereInput = { scope };
  if (city) matchWhere.city = city;
  if (scope === "REGIONAL" && sevaUsaRegion) matchWhere.sevaUsaRegion = sevaUsaRegion;

  const where: Prisma.SevaActivityGroupWhereInput =
    scopeWhere && Object.keys(scopeWhere).length > 0 ? { AND: [scopeWhere, matchWhere] } : matchWhere;

  const items = await prisma.sevaActivityGroup.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      scope: true,
      city: true,
      sevaUsaRegion: true,
      status: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(items);
}

/**
 * POST /api/admin/seva-activity-groups
 * Body: title, description?, scope, city, sevaUsaRegion?, status?, sortOrder?
 */
export async function POST(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const scope = parseScopeFromBody(body);
    let city = typeof body.city === "string" ? body.city.trim() : "";
    const sevaUsaRegionRaw = body.sevaUsaRegion != null ? String(body.sevaUsaRegion).trim() : "";
    const sevaUsaRegion = sevaUsaRegionRaw || null;

    if (scope === "NATIONAL" && !city) city = "National";

    const scopeCheck = validateSevaScopeForSession(session, {
      scope,
      city,
      sevaUsaRegion,
    });
    if (!scopeCheck.ok) {
      return NextResponse.json(
        { error: scopeCheck.error },
        { status: scopeCheck.status ?? 400 }
      );
    }

    if (!city) {
      return NextResponse.json({ error: "City is required" }, { status: 400 });
    }
    if (scope === "REGIONAL" && (!sevaUsaRegion || !isValidUsaRegion(sevaUsaRegion))) {
      return NextResponse.json({ error: "A valid USA region is required for regional groups" }, { status: 400 });
    }

    const row = {
      scope,
      city,
      sevaUsaRegion: scope === "REGIONAL" ? sevaUsaRegion : null,
    };
    if (!sessionCanAccessAdminSevaActivityGroup(session, row)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status =
      body.status === "DRAFT" || body.status === "PUBLISHED" || body.status === "ARCHIVED"
        ? body.status
        : "PUBLISHED";

    const sortOrder =
      typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? Math.floor(body.sortOrder) : 0;

    const created = await prisma.sevaActivityGroup.create({
      data: {
        title,
        description: typeof body.description === "string" ? body.description.trim() || null : null,
        scope,
        city,
        sevaUsaRegion: scope === "REGIONAL" ? sevaUsaRegion : null,
        status,
        sortOrder,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    console.error("POST seva-activity-groups:", e);
    return NextResponse.json(
      { error: "Failed to create group", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
