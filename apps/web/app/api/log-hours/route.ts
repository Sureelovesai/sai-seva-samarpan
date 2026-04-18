import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth";

/**
 * GET /api/log-hours
 * Logged-in user's Log Hours rows (by session email), newest first. Used for dashboard + viewing certificates later.
 * Query: limit (default 20, max 50), offset (default 0).
 * Response: { entries, total } — total is the count for this user (same filter as entries).
 */
export async function GET(req: Request) {
  try {
    const session = getSessionFromCookie(req.headers.get("cookie"));
    if (!session?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = session.email.trim().toLowerCase();
    const { searchParams } = new URL(req.url);
    const limitRaw = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, limitRaw)) : 20;
    const offsetRaw = parseInt(searchParams.get("offset") || "0", 10);
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

    const where = { email };

    const [entries, total] = await Promise.all([
      prisma.loggedHours.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          volunteerName: true,
          location: true,
          activityCategory: true,
          hours: true,
          date: true,
          comments: true,
          createdAt: true,
        },
      }),
      prisma.loggedHours.count({ where }),
    ]);

    return NextResponse.json({ entries, total });
  } catch (e: unknown) {
    console.error("Log hours GET error:", e);
    return NextResponse.json(
      { error: "Failed to load log hours", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/log-hours
 * Submit hours from the Log Hours page.
 * Body: { volunteerName: string, location?: string, activityCategory: string, hours: number, date: string (ISO), comments?: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const volunteerName = body?.volunteerName?.trim?.();
    const activityCategory = body?.activityCategory?.trim?.();
    const hoursNum = body?.hours != null ? Number(body.hours) : NaN;
    const dateStr = body?.date?.trim?.();

    if (!volunteerName) {
      return NextResponse.json(
        { error: "Volunteer name is required" },
        { status: 400 }
      );
    }
    if (!activityCategory) {
      return NextResponse.json(
        { error: "Seva activity (category) is required" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(hoursNum) || hoursNum < 0) {
      return NextResponse.json(
        { error: "Valid hours (number ≥ 0) is required" },
        { status: 400 }
      );
    }
    if (!dateStr) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400 }
      );
    }

    const email = body?.email?.trim?.()?.toLowerCase?.() || null;

    const created = await prisma.loggedHours.create({
      data: {
        volunteerName,
        email,
        location: body?.location?.trim?.() || null,
        activityCategory,
        hours: hoursNum,
        date,
        comments: body?.comments?.trim?.() || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    console.error("Log hours POST error:", e);
    return NextResponse.json(
      { error: "Failed to submit hours", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
