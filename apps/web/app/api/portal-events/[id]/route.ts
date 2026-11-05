import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await prisma.portalEvent.findFirst({
    where: { id, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      description: true,
      heroImageUrl: true,
      flyerUrl: true,
      startsAt: true,
      venue: true,
      signupsEnabled: true,
      hasSlots: true,
      slots: {
        select: {
          id: true,
          slotName: true,
          slotDate: true,
          startTime: true,
          endTime: true,
          capacity: true,
        },
        orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
      },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}
