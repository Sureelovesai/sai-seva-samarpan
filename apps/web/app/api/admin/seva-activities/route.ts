import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import { syncSevaContributionItems } from "@/lib/syncSevaContributionItems";
import {
  adminSevaActivityListWhere,
  parseScopeFromBody,
  validateSevaScopeForSession,
} from "@/lib/sevaCoordinatorActivityAccess";
import { resolveGroupIdForActivity } from "@/lib/resolveSevaActivityGroupId";

function toIntOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBooleanDefaultTrue(v: unknown): boolean {
  return v === undefined ? true : Boolean(v);
}

export async function GET(req: Request) {
  const session = await getSessionWithRole(req.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "VOLUNTEER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status"); // DRAFT | PUBLISHED
  const active = searchParams.get("active"); // true | false

  const andParts: object[] = [];
  const scopeWhere = adminSevaActivityListWhere(session);
  if (scopeWhere) andParts.push(scopeWhere);

  const where: Record<string, unknown> = {};
  if (status && (status === "DRAFT" || status === "PUBLISHED")) where.status = status;
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  if (q) {
    andParts.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { locationName: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (andParts.length) {
    where.AND = [...andParts];
  }

  const items = await prisma.sevaActivity.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    if (!body?.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const category = body.category?.trim?.();
    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const scope = parseScopeFromBody(body);
    const sevaUsaRegionRaw = body.sevaUsaRegion != null ? String(body.sevaUsaRegion).trim() : "";
    const sevaUsaRegion = sevaUsaRegionRaw || null;

    let city = body.city?.trim?.() ?? "";
    if (scope === "NATIONAL" && !city) {
      city = "National";
    }

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

    if (!body.startDate || !String(body.startDate).trim()) {
      return NextResponse.json({ error: "Start date is required" }, { status: 400 });
    }
    if (!body.endDate || !String(body.endDate).trim()) {
      return NextResponse.json({ error: "End date is required" }, { status: 400 });
    }
    if (!body.startTime || !String(body.startTime).trim()) {
      return NextResponse.json({ error: "Start time is required" }, { status: 400 });
    }
    if (!body.endTime || !String(body.endTime).trim()) {
      return NextResponse.json({ error: "End time is required" }, { status: 400 });
    }
    const durationHours = typeof body.durationHours === "number" ? body.durationHours : parseFloat(body.durationHours);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return NextResponse.json({ error: "Duration (hours) is required and must be greater than 0" }, { status: 400 });
    }
    const address = body.address?.trim?.();
    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }
    const coordinatorName = body.coordinatorName?.trim?.();
    if (!coordinatorName) {
      return NextResponse.json({ error: "Coordinator name is required" }, { status: 400 });
    }
    const coordinatorEmail = body.coordinatorEmail?.trim?.();
    if (!coordinatorEmail) {
      return NextResponse.json({ error: "Coordinator email is required" }, { status: 400 });
    }
    const coordinatorPhone = body.coordinatorPhone?.trim?.();
    if (!coordinatorPhone) {
      return NextResponse.json({ error: "Coordinator phone number is required" }, { status: 400 });
    }

    const capacityNum = toIntOrNull(body.capacity);
    if (
      capacityNum === null ||
      !Number.isInteger(capacityNum) ||
      capacityNum < 1
    ) {
      return NextResponse.json(
        { error: "Capacity is required and must be a whole number of at least 1" },
        { status: 400 }
      );
    }

    let resolvedGroupId: string | null = null;
    try {
      resolvedGroupId = await resolveGroupIdForActivity(session, body.groupId, {
        scope,
        city,
        sevaUsaRegion: scope === "REGIONAL" ? sevaUsaRegion : null,
      });
    } catch (e: unknown) {
      const status = (e as Error & { status?: number }).status ?? 400;
      return NextResponse.json(
        { error: (e as Error).message || "Invalid activity group" },
        { status }
      );
    }

    const created = await prisma.sevaActivity.create({
      data: {
        title: body.title.trim(),
        category,
        description: body.description?.trim?.() || null,

        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        startTime: String(body.startTime).trim(),
        endTime: String(body.endTime).trim(),
        durationHours,

        scope,
        sevaUsaRegion: scope === "REGIONAL" ? sevaUsaRegion : null,
        city,
        organizationName: body.organizationName?.trim?.() || null,
        locationName: body.locationName?.trim?.() || null,
        address,

        capacity: capacityNum,
        allowKids: toBooleanDefaultTrue(body.allowKids),
        joinSevaEnabled: body.joinSevaEnabled === undefined ? true : Boolean(body.joinSevaEnabled),

        coordinatorName,
        coordinatorEmail,
        coordinatorPhone,

        imageUrl: body.imageUrl?.trim?.() || null,

        isActive: body.isActive === false ? false : true,
        isFeatured: Boolean(body.isFeatured),
        status: body.status === "DRAFT" ? "DRAFT" : "PUBLISHED",
        groupId: resolvedGroupId,
      },
    });

    if (Array.isArray(body.contributionItems)) {
      try {
        await syncSevaContributionItems(created.id, body.contributionItems);
      } catch (syncErr: unknown) {
        await prisma.sevaActivity.delete({ where: { id: created.id } });
        return NextResponse.json(
          {
            error: "Failed to save item list",
            detail: syncErr instanceof Error ? syncErr.message : String(syncErr),
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to create activity", detail: e?.message },
      { status: 500 }
    );
  }
}
