import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await prisma.portalEvent.findUnique({
    where: { id },
    include: { _count: { select: { signups: true } } },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.portalEvent.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    type Patch = {
      title?: string;
      description?: string;
      venue?: string;
      startsAt?: Date;
      /** Clear so the ~24h cron can run again for the new start time. */
      reminderSentAt?: null;
      heroImageUrl?: string | null;
      flyerUrl?: string | null;
      signupsEnabled?: boolean;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      organizerEmail?: string | null;
    };
    const data: Patch = {};

    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (typeof body.description === "string") data.description = body.description.trim();
    if (typeof body.venue === "string") data.venue = body.venue.trim();
    if (body.startsAt !== undefined) {
      if (typeof body.startsAt !== "string" || !body.startsAt.trim()) {
        return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
      }
      const d = new Date(body.startsAt);
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
      data.startsAt = d;
      if (existing.startsAt.getTime() !== d.getTime()) {
        data.reminderSentAt = null;
      }
    }
    if (body.heroImageUrl !== undefined) {
      data.heroImageUrl =
        typeof body.heroImageUrl === "string" && body.heroImageUrl.trim()
          ? body.heroImageUrl.trim()
          : null;
    }
    if (body.flyerUrl !== undefined) {
      data.flyerUrl =
        typeof body.flyerUrl === "string" && body.flyerUrl.trim() ? body.flyerUrl.trim() : null;
    }
    if (typeof body.signupsEnabled === "boolean") data.signupsEnabled = body.signupsEnabled;
    if (body.status === "DRAFT" || body.status === "PUBLISHED" || body.status === "ARCHIVED") {
      data.status = body.status;
    }
    if (body.organizerEmail !== undefined) {
      if (body.organizerEmail === null || body.organizerEmail === "") {
        data.organizerEmail = null;
      } else if (typeof body.organizerEmail === "string" && body.organizerEmail.trim()) {
        data.organizerEmail = body.organizerEmail.trim().toLowerCase();
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const event = await prisma.portalEvent.update({
      where: { id },
      data,
    });
    return NextResponse.json(event);
  } catch (e: unknown) {
    console.error("PATCH portal-events/[id]:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.portalEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found or could not delete" }, { status: 404 });
  }
}
