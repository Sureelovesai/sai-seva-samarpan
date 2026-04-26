import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { isActivityEnded } from "@/lib/activityEnded";
import { createVolunteerSignup } from "@/lib/sevaVolunteerSignupCore";
import { sendSevaJoinSignupEmails } from "@/lib/sendSevaJoinSignupEmails";

const MAX_BATCH = 25;

/**
 * POST /api/seva-signups/batch
 * Register the same volunteer for multiple activities in one request (Seva Details when several
 * activities are open in tabs). Sends one confirmation email per activity (+ coordinator each time),
 * same as individual Join Seva.
 *
 * Rules:
 * - Every activity must be active, not ended, and must have **no** contribution-item rows
 *   (coordinators who use “Register” / supply lists require per-activity item choice — not bulk).
 * - Same duplicate rules as single signup (email already on roster → rejected for that activity).
 * - All signups succeed or none (interactive transaction).
 *
 * Body: { activityIds: string[], name, email, phone, adultsCount?, kidsCount? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawIds = body?.activityIds;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() || null : null;
    const adultsCount = Math.max(0, Math.floor(Number(body?.adultsCount) ?? 1));
    const kidsCount = Math.max(0, Math.floor(Number(body?.kidsCount) || 0));

    if (!Array.isArray(rawIds) || rawIds.length < 2) {
      return NextResponse.json(
        { error: "Provide at least two activityIds for batch registration, or use single POST /api/seva-signups." },
        { status: 400 }
      );
    }
    if (rawIds.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `You can register for at most ${MAX_BATCH} activities at once.` },
        { status: 400 }
      );
    }

    const activityIds = [...new Set(rawIds.map((x: unknown) => String(x ?? "").trim()).filter(Boolean))];
    if (activityIds.length < 2) {
      return NextResponse.json({ error: "Need at least two distinct activity IDs." }, { status: 400 });
    }
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (adultsCount + kidsCount < 1) {
      return NextResponse.json(
        { error: "At least one participant (adults or kids) is required." },
        { status: 400 }
      );
    }

    const rows = await prisma.sevaActivity.findMany({
      where: { id: { in: activityIds }, isActive: true },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        durationHours: true,
        coordinatorName: true,
        coordinatorEmail: true,
        coordinatorPhone: true,
        capacity: true,
        locationName: true,
        address: true,
        allowKids: true,
        _count: { select: { contributionItems: true } },
      },
    });

    if (rows.length !== activityIds.length) {
      return NextResponse.json(
        { error: "One or more activities were not found or are inactive." },
        { status: 400 }
      );
    }

    const blockedByItems: string[] = [];
    const endedTitles: string[] = [];
    for (const a of rows) {
      if (a._count.contributionItems > 0) {
        blockedByItems.push(a.title ?? a.id);
      }
      if (
        isActivityEnded({
          startDate: a.startDate,
          endDate: a.endDate,
          startTime: a.startTime,
          endTime: a.endTime,
          durationHours: a.durationHours,
        })
      ) {
        endedTitles.push(a.title ?? a.id);
      }
    }
    if (blockedByItems.length > 0) {
      return NextResponse.json(
        {
          error:
            "Batch registration is only available for activities that do not use the item / supply list (Register). " +
            "Remove these from your selection and join them individually, or use Register for supplies: " +
            blockedByItems.slice(0, 8).join("; ") +
            (blockedByItems.length > 8 ? ` … (+${blockedByItems.length - 8} more)` : ""),
          code: "HAS_CONTRIBUTION_ITEMS",
        },
        { status: 400 }
      );
    }
    if (endedTitles.length > 0) {
      return NextResponse.json(
        {
          error: "These activities have already ended: " + endedTitles.slice(0, 8).join("; "),
          code: "ACTIVITIES_ENDED",
        },
        { status: 400 }
      );
    }
    if (kidsCount > 0) {
      const disallowKids = rows
        .filter((a: (typeof rows)[number]) => !a.allowKids)
        .map((a: (typeof rows)[number]) => a.title ?? a.id);
      if (disallowKids.length > 0) {
        return NextResponse.json(
          {
            error:
              "Kids are not allowed for these selected activities: " +
              disallowKids.slice(0, 8).join("; ") +
              (disallowKids.length > 8 ? ` … (+${disallowKids.length - 8} more)` : ""),
            code: "KIDS_NOT_ALLOWED",
          },
          { status: 400 }
        );
      }
    }

    // Pre-check duplicates (clearer than failing mid-transaction)
    const existing = await prisma.sevaSignup.findMany({
      where: {
        email: { equals: email, mode: "insensitive" },
        activityId: { in: activityIds },
        status: { not: "CANCELLED" },
      },
      select: { activityId: true, activity: { select: { title: true } } },
    });
    if (existing.length > 0) {
      const t = existing
        .map((e: { activityId: string; activity: { title: string | null } | null }) => e.activity?.title ?? e.activityId)
        .join("; ");
      return NextResponse.json(
        { error: `You are already registered for: ${t}`, code: "ALREADY_REGISTERED" },
        { status: 409 }
      );
    }

    const ordered = activityIds
      .map((id) => rows.find((r: (typeof rows)[number]) => r.id === id))
      .filter((x): x is NonNullable<typeof x> => x != null);

    const results: {
      activityId: string;
      title: string | null;
      signupId: string;
      status: "APPROVED" | "PENDING";
    }[] = [];

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const row of ordered) {
        const { signup } = await createVolunteerSignup(tx, {
          activityId: row.id,
          volunteerName: name,
          email,
          phone,
          adultsCount,
          kidsCount,
        });
        results.push({
          activityId: row.id,
          title: row.title,
          signupId: signup.id,
          status: signup.status,
        });
      }
    });

    // Emails after successful commit (same as single route — one pair per activity)
    for (const row of ordered) {
      const r = results.find((x) => x.activityId === row.id);
      if (!r) continue;
      await sendSevaJoinSignupEmails({
        activity: {
          id: row.id,
          title: row.title,
          coordinatorName: row.coordinatorName,
          coordinatorEmail: row.coordinatorEmail,
          coordinatorPhone: row.coordinatorPhone,
          startDate: row.startDate,
          startTime: row.startTime,
          endTime: row.endTime,
          locationName: row.locationName,
          address: row.address,
        },
        volunteerName: name,
        email,
        phone,
        adultsCount,
        kidsCount,
        status: r.status,
      });
    }

    const approved = results.filter((x) => x.status === "APPROVED").length;
    const waitlisted = results.filter((x) => x.status === "PENDING").length;

    return NextResponse.json({
      results,
      summary: { count: results.length, approved, waitlisted },
    });
  } catch (e: unknown) {
    console.error("Batch seva signup error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Batch registration failed", detail: message }, { status: 500 });
  }
}
