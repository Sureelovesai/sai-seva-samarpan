import { NextResponse } from "next/server";
import type { SevaContributionItem } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import { sessionCanAccessAdminSevaActivity } from "@/lib/sevaCoordinatorActivityAccess";
import { syncSevaContributionItems, type ContributionItemInput } from "@/lib/syncSevaContributionItems";

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Start date must be strictly after this calendar day (UTC). */
function todayUtcKey(): string {
  return utcDateKey(new Date());
}

function parseBodyDate(s: string): Date | null {
  const t = String(s).trim();
  if (!t) return null;
  const key = t.length >= 10 ? t.slice(0, 10) : t;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const d = new Date(key + "T12:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * POST /api/admin/seva-activities/[id]/clone
 * Body: { startDate: "yyyy-mm-dd", endDate: "yyyy-mm-dd" }
 * Creates a new activity (signups not copied). Dates must be in the future (start > today UTC).
 * New row: isActive true, status PUBLISHED, isFeatured false, title gets " (Copy)".
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "VOLUNTEER" || session.role === "BLOG_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: sourceId } = await params;
    if (!sourceId) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const start = parseBodyDate(typeof body.startDate === "string" ? body.startDate : "");
    const end = parseBodyDate(typeof body.endDate === "string" ? body.endDate : "");
    if (!start || !end) {
      return NextResponse.json(
        { error: "Valid startDate and endDate (yyyy-mm-dd) are required" },
        { status: 400 }
      );
    }

    const todayKey = todayUtcKey();
    const startKey = utcDateKey(start);
    const endKey = utcDateKey(end);

    if (startKey <= todayKey) {
      return NextResponse.json(
        { error: "Start date must be in the future (after today)." },
        { status: 400 }
      );
    }
    if (endKey < startKey) {
      return NextResponse.json(
        { error: "End date must be on or after the start date." },
        { status: 400 }
      );
    }

    const source = await prisma.sevaActivity.findUnique({
      where: { id: sourceId },
      include: {
        contributionItems: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    if (!sessionCanAccessAdminSevaActivity(session, source)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const city = source.city?.trim() || "";
    const category = source.category?.trim() || "";
    const address = source.address?.trim() || "";
    const coordinatorName = source.coordinatorName?.trim() || "";
    const coordinatorEmail = source.coordinatorEmail?.trim() || "";
    const coordinatorPhone = source.coordinatorPhone?.trim() || "";

    if (!city || !category) {
      return NextResponse.json(
        { error: "Source activity is missing city or category; edit it before cloning." },
        { status: 400 }
      );
    }
    if (!address) {
      return NextResponse.json(
        { error: "Source activity is missing address; edit it before cloning." },
        { status: 400 }
      );
    }
    if (!coordinatorName || !coordinatorEmail || !coordinatorPhone) {
      return NextResponse.json(
        {
          error:
            "Source activity is missing coordinator name, email, or phone; edit it before cloning.",
        },
        { status: 400 }
      );
    }

    const capacityNum =
      source.capacity != null && Number.isInteger(source.capacity) && source.capacity >= 1
        ? source.capacity
        : null;
    if (capacityNum === null) {
      return NextResponse.json(
        { error: "Source activity must have capacity of at least 1; edit it before cloning." },
        { status: 400 }
      );
    }

    const startTime = source.startTime?.trim();
    const endTime = source.endTime?.trim();
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "Source activity is missing start or end time; edit it before cloning." },
        { status: 400 }
      );
    }

    let durationHours =
      source.durationHours != null && source.durationHours > 0 ? source.durationHours : null;
    if (durationHours === null) {
      durationHours = 1;
    }

    const baseTitle = source.title.trim();
    const newTitle = `${baseTitle} (Copy)`;

    const contributionPayload: ContributionItemInput[] = source.contributionItems.map((it: SevaContributionItem) => ({
      name: it.name,
      category: it.category ?? "",
      neededLabel: it.neededLabel ?? "",
      maxQuantity: Math.max(1, it.maxQuantity ?? 1),
    }));

    const created = await prisma.sevaActivity.create({
      data: {
        title: newTitle,
        category,
        description: source.description?.trim() || null,
        startDate: start,
        endDate: end,
        startTime,
        endTime,
        durationHours,
        scope: source.scope,
        sevaUsaRegion: source.sevaUsaRegion,
        city,
        locationName: source.locationName?.trim() || null,
        address,
        capacity: capacityNum,
        coordinatorName,
        coordinatorEmail,
        coordinatorPhone,
        imageUrl: source.imageUrl?.trim() || null,
        isActive: true,
        isFeatured: false,
        status: "PUBLISHED",
        groupId: source.groupId,
      },
    });

    if (contributionPayload.length > 0) {
      try {
        await syncSevaContributionItems(created.id, contributionPayload);
      } catch (syncErr: unknown) {
        await prisma.sevaActivity.delete({ where: { id: created.id } });
        return NextResponse.json(
          {
            error: "Failed to copy item list",
            detail: syncErr instanceof Error ? syncErr.message : String(syncErr),
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    console.error("Admin seva-activities clone error:", e);
    return NextResponse.json(
      { error: "Failed to clone activity", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
