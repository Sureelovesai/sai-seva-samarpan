import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
