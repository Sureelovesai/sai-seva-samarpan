import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hasRole } from "@/lib/getRole";
import { syncSevaContributionItems } from "@/lib/syncSevaContributionItems";

export const dynamic = "force-dynamic";

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cityMatches(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * POST /api/community-outreach/activity
 * Creates a published seva activity with organizationName from an APPROVED community profile.
 * Activity city must match the profile city.
 */
export async function POST(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) {
      return NextResponse.json({ error: "Sign in to post a service activity." }, { status: 401 });
    }

    const profile = await prisma.communityOutreachProfile.findUnique({
      where: { userId: session.sub },
    });
    const isAdmin = hasRole(session, "ADMIN");
    const approvedProfile = profile?.status === "APPROVED" ? profile : null;
    if (!approvedProfile && !isAdmin) {
      return NextResponse.json(
        {
          error:
            "Your organization profile must be approved before you can post activities. Complete step 2 and wait for review.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    if (!body?.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const category = typeof body.category === "string" ? body.category.trim() : "";
    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const city = typeof body.city === "string" ? body.city.trim() : "";
    if (!city) {
      return NextResponse.json({ error: "City is required" }, { status: 400 });
    }

    const organizationNameFromAdmin =
      typeof body.organizationName === "string" ? body.organizationName.trim() : "";
    if (approvedProfile) {
      if (!cityMatches(city, approvedProfile.city)) {
        return NextResponse.json(
          {
            error: `Activities must be listed for your organization’s city: ${approvedProfile.city}.`,
          },
          { status: 400 }
        );
      }
    } else if (isAdmin) {
      if (!organizationNameFromAdmin) {
        return NextResponse.json(
          { error: "Organization name is required when posting as a site administrator." },
          { status: 400 }
        );
      }
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
    const durationHours =
      typeof body.durationHours === "number" ? body.durationHours : parseFloat(String(body.durationHours));
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return NextResponse.json(
        { error: "Duration (hours) is required and must be greater than 0" },
        { status: 400 }
      );
    }
    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }
    const coordinatorName = typeof body.coordinatorName === "string" ? body.coordinatorName.trim() : "";
    if (!coordinatorName) {
      return NextResponse.json({ error: "Coordinator name is required" }, { status: 400 });
    }
    const coordinatorEmail = typeof body.coordinatorEmail === "string" ? body.coordinatorEmail.trim() : "";
    if (!coordinatorEmail) {
      return NextResponse.json({ error: "Coordinator email is required" }, { status: 400 });
    }
    const coordinatorPhone = typeof body.coordinatorPhone === "string" ? body.coordinatorPhone.trim() : "";
    if (!coordinatorPhone) {
      return NextResponse.json({ error: "Coordinator phone number is required" }, { status: 400 });
    }

    const capacityNum = toIntOrNull(body.capacity);
    if (capacityNum === null || !Number.isInteger(capacityNum) || capacityNum < 1) {
      return NextResponse.json(
        { error: "Capacity is required and must be a whole number of at least 1" },
        { status: 400 }
      );
    }

    const created = await prisma.sevaActivity.create({
      data: {
        title: body.title.trim(),
        category,
        description: typeof body.description === "string" ? body.description.trim() || null : null,

        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        startTime: String(body.startTime).trim(),
        endTime: String(body.endTime).trim(),
        durationHours,

        city,
        organizationName: approvedProfile ? approvedProfile.organizationName : organizationNameFromAdmin,
        locationName:
          typeof body.locationName === "string" ? body.locationName.trim() || null : null,
        address,

        capacity: capacityNum,

        coordinatorName,
        coordinatorEmail,
        coordinatorPhone,

        imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null,

        isActive: body.isActive === false ? false : true,
        isFeatured: false,
        status: "PUBLISHED",
        listedAsCommunityOutreach: true,
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
  } catch (e: unknown) {
    console.error("community-outreach activity POST:", e);
    return NextResponse.json(
      { error: "Failed to create activity", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
