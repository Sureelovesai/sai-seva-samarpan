import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, activityCityWhere } from "@/lib/getRole";

function toIntOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const session = await getSessionWithRole(req.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "VOLUNTEER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status"); // DRAFT | PUBLISHED
  const active = searchParams.get("active"); // true | false

  const where: any = {};

  if (session.role === "SEVA_COORDINATOR") {
    const cities = session.coordinatorCities?.length
      ? session.coordinatorCities
      : [];
    where.AND = [activityCityWhere(cities)];
  }
  if (status && (status === "DRAFT" || status === "PUBLISHED")) where.status = status;
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  if (q) {
    const textClause = {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { locationName: { contains: q, mode: "insensitive" } },
      ],
    };
    where.AND = where.AND ? [...where.AND, textClause] : [textClause];
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

    const city = body.city?.trim?.();
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

    if (session.role === "SEVA_COORDINATOR" && session.coordinatorCities?.length) {
      const allowed = session.coordinatorCities.some(
        (c) => c.trim().toLowerCase() === city.toLowerCase()
      );
      if (!allowed) {
        return NextResponse.json(
          { error: "You can only add activities for your registered location(s)" },
          { status: 403 }
        );
      }
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

        city,
        locationName: body.locationName?.trim?.() || null,
        address,

        capacity: capacityNum,

        coordinatorName,
        coordinatorEmail,
        coordinatorPhone,

        imageUrl: body.imageUrl?.trim?.() || null,

        isActive: body.isActive === false ? false : true,
        isFeatured: Boolean(body.isFeatured),
        status: body.status === "DRAFT" ? "DRAFT" : "PUBLISHED",
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to create activity", detail: e?.message },
      { status: 500 }
    );
  }
}
